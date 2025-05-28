import os
import asyncio
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import (
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    InlineKeyboardButton,
    InlineKeyboardMarkup
)
import django
from dotenv import load_dotenv
from asgiref.sync import sync_to_async, async_to_sync
from django.db.models.signals import post_save
from django.dispatch import receiver

# Инициализация Django
load_dotenv()
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from partner.models import Partner, Courier, Order, Store, OrderItem, OrderByClient

# Инициализация бота
API_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

# Клавиатура для отправки контакта
contact_kb = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text='Отправить контакт', request_contact=True)]],
    resize_keyboard=True
)

# Обработчики сообщений
@dp.message(Command('start'))
async def cmd_start(message: types.Message):
    await message.answer(
        '👋 Добро пожаловать в курьерскую службу Tass!\n'
        'Для авторизации отправьте ваш номер телефона:',
        reply_markup=contact_kb
    )

@dp.message(F.content_type == 'contact')
async def handle_contact(message: types.Message):
    phone = ''.join(filter(str.isdigit, message.contact.phone_number))
    tg_id = str(message.from_user.id)
    
    try:
        # Проверка курьера
        courier = await sync_to_async(Courier.objects.get)(phone_number=phone)
        courier.tg_code = tg_id
        await sync_to_async(courier.save)()
        await message.answer('✅ Вы авторизованы как курьер!', reply_markup=ReplyKeyboardRemove())
    except Courier.DoesNotExist:
        try:
            # Проверка партнера
            partner = await sync_to_async(Partner.objects.get)(phone_number=phone)
            partner.tg_code = tg_id
            await sync_to_async(partner.save)()
            await message.answer('✅ Вы авторизованы как партнер!', reply_markup=ReplyKeyboardRemove())
        except Partner.DoesNotExist:
            await message.answer('❌ Пользователь не найден!', reply_markup=contact_kb)

@dp.callback_query(F.data.startswith('take_'))
async def take_order(callback: types.CallbackQuery):
    order_id = callback.data.split('_', 1)[1]
    tg_id     = str(callback.from_user.id)

    # 1) Назначаем курьера и меняем статус
    order   = await sync_to_async(Order.objects.get)(pk=order_id)
    courier = await sync_to_async(Courier.objects.get)(tg_code=tg_id)
    if order.courier:
        return await callback.answer('⚠️ Заказ уже взят!', show_alert=True)

    order.courier = courier
    order.status  = 'en_route'
    await sync_to_async(order.save)()

    await callback.answer('✅ Вы взяли заказ!')

    # 2) Сразу вызываем показ выбора магазина
    await show_branch_selection(callback, order)

    complete_button = InlineKeyboardMarkup(inline_keyboard=[[
    InlineKeyboardButton(
        text="Завершить заказ",
        callback_data=f"complete_store_{order.id}"
    )
    ]])

    await bot.send_message(
        chat_id=courier.tg_code,
        text=f"🚚 Заказ #{order.id} назначен вам.\n"
            f"Адрес: {order.delivery_address}\n"
            f"Ожидается доставка.",
        reply_markup=complete_button
    )


async def show_branch_selection(callback: types.CallbackQuery, order: Order):
    # Собираем всех Partner-филиалов по магазинам из заказа
    items = await sync_to_async(list)(
        order.items.select_related('product__store')
    )
    partners_map = {}
    for item in items:
        store = item.product.store
        # Берём всех партнёров (филиалы) этого магазина
        partners = await sync_to_async(list)(store.partners.all())
        for pr in partners:
            partners_map[pr.id] = pr

    if not partners_map:
        await callback.message.answer("❌ Нет доступных филиалов для выбора.")
        return

    # Кнопки с callback_data = selectbranch_<order_id>_<partner_id>
    buttons = [
        [InlineKeyboardButton(
            text=pr.address,
            callback_data=f"selectbranch_{order.id}_{pr.id}"
        )]
        for pr in partners_map.values()
    ]
    keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)
    await callback.message.answer(
        "🏪 Выберите филиал для выполнения заказа:",
        reply_markup=keyboard
    )
    

@dp.callback_query(F.data.startswith("selectbranch_"))
async def select_branch(callback: types.CallbackQuery):
    _, order_id, partner_id = callback.data.split("_", 2)
    # Получаем все объекты через sync_to_async
    order, partner = await sync_to_async(lambda: (
        Order.objects.get(pk=order_id),
        Partner.objects.get(pk=partner_id)
    ))()
    courier = await sync_to_async(lambda: Courier.objects.get(tg_code=str(callback.from_user.id)))()

    order.partner = partner
    await sync_to_async(order.save)()

    # Фильтруем позиции по выбранному партнеру
    items = await sync_to_async(list)(
        order.items.filter(product__store__partners=partner).select_related('product')
    )
    items_text = "\n".join(
        f"• {it.product.name} × {it.quantity} ({it.product.description}) — {float(it.product.price) * it.quantity:.2f} сом"
        for it in items
    )
    total = sum(float(it.product.price) * it.quantity for it in items)

    # Подключаем промокод, если он есть и относится к текущему партнеру
    promo = await sync_to_async(lambda: order.promocode_used)()
    promo_line = ""
    if promo:
        # Узнаем, к какому магазину относится промокод
        promo_store = await sync_to_async(lambda: promo.store)()
        # Если этот магазин поставляет выбранный филиал партнера
        if await sync_to_async(lambda: promo_store.partners.filter(pk=partner.pk).exists())():
            promo_line = f"\nПромокод: {promo.code} — скидка {promo.discount_amount} сом"
            total -= promo.discount_amount

    courier_name = courier.user or courier.phone_number
    receipt = (
        f"🧾 Чек заказа #{order.id}\n"
        f"{items_text}{promo_line}\n"
        f"Итого: {total:.2f} сом\n"
        f"Курьер: {courier_name}"
    )

    if partner.tg_code:
        await bot.send_message(partner.tg_code, receipt)
    await callback.answer("✅ Филиал выбран и чек отправлен.")


@dp.callback_query(lambda c: c.data and c.data.startswith("client_take_"))
async def process_take_client(callback_query: types.CallbackQuery):
    try:
        order_id = int(callback_query.data.split("_")[-1])
        user_tg = callback_query.from_user.id

        # Получаем курьера
        courier = await sync_to_async(Courier.objects.get)(tg_code=str(user_tg))
        order = await sync_to_async(OrderByClient.objects.get)(pk=order_id)

        if order.courier:
            await callback_query.answer("Заявка уже взята другим курьером.", show_alert=True)
            return

        # Обновляем заказ
        order.courier = courier
        order.status = 'en_route'
        await sync_to_async(order.save)()

        # Удаляем кнопку "Взять заявку" из сообщения
        await bot.edit_message_reply_markup(
            chat_id=callback_query.message.chat.id,
            message_id=callback_query.message.message_id,
            reply_markup=None
        )

        # Отправляем подтверждение
        await callback_query.answer("✅ Вы успешно взяли заявку!", show_alert=True)
        
        # Отправляем сообщение курьеру
        complete_button = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="Завершить доставку",
                callback_data=f"complete_client_{order.id}"
            )
        ]])
        
        await bot.send_message(
            chat_id=courier.tg_code,
            text=f"🚚 Вы взяли заявку #{order.id}\n"
                 f"Текущий статус: В пути\n"
                 f"Адрес А: {order.delivery_address_a}\n"
                 f"Адрес Б: {order.delivery_address_b}",
            reply_markup=complete_button
        )

    except Courier.DoesNotExist:
        await callback_query.answer("❌ Вы не авторизованы как курьер!", show_alert=True)
    except OrderByClient.DoesNotExist:
        await callback_query.answer("❌ Заявка не найдена!", show_alert=True)
    except Exception as e:
        print(f"Error in process_take_client: {e}")
        await callback_query.answer("❌ Произошла ошибка!", show_alert=True)


@dp.callback_query(lambda c: c.data and c.data.startswith("complete_store_"))
async def process_complete_store(callback_query: types.CallbackQuery):
    try:
        order_id = int(callback_query.data.split("_")[-1])
        user_tg = callback_query.from_user.id

        # Получаем курьера
        courier = await sync_to_async(Courier.objects.get)(tg_code=str(user_tg))
        order = await sync_to_async(Order.objects.get)(pk=order_id, courier=courier)

        if order.status != 'en_route':
            await callback_query.answer("❌ Заказ не в статусе 'В пути'!", show_alert=True)
            return

        # Обновляем статус
        order.status = 'delivered'
        order.paid = True
        await sync_to_async(order.save)()

        # Удаляем кнопку
        await bot.edit_message_reply_markup(
            chat_id=callback_query.message.chat.id,
            message_id=callback_query.message.message_id,
            reply_markup=None
        )

        await callback_query.answer("✅ Заказ завершён!", show_alert=True)

        await bot.send_message(
            chat_id=courier.tg_code,
            text=f"✅ Заказ #{order.id} завершён!\n"
                 f"Статус: Доставлено\n"
                 f"Время: {order.created_at:%Y-%m-%d %H:%M}"
        )

        # Уведомление партнеру, если есть
        if order.partner and order.partner.tg_code:
            await bot.send_message(
                chat_id=order.partner.tg_code,
                text=f"📦 Заказ #{order.id} был успешно доставлен курьером {courier.user or courier.phone_number}."
            )

    except Order.DoesNotExist:
        await callback_query.answer("❌ Заказ не найден или вы не ответственный курьер!", show_alert=True)
    except Exception as e:
        print(f"Error in process_complete_store: {e}")
        await callback_query.answer("❌ Произошла ошибка при завершении!", show_alert=True)


@dp.callback_query(lambda c: c.data and c.data.startswith("complete_client_"))
async def process_complete_client(callback_query: types.CallbackQuery):
    try:
        order_id = int(callback_query.data.split("_")[-1])
        user_tg = callback_query.from_user.id

        # Проверяем права курьера
        courier = await sync_to_async(Courier.objects.get)(tg_code=str(user_tg))
        order = await sync_to_async(OrderByClient.objects.get)(pk=order_id, courier=courier)

        if order.status != 'en_route':
            await callback_query.answer("❌ Заказ не в статусе 'В пути'!", show_alert=True)
            return

        # Обновляем статус
        order.status = 'delivered'
        order.paid = True
        await sync_to_async(order.save)()

        # Удаляем кнопку завершения
        await bot.edit_message_reply_markup(
            chat_id=callback_query.message.chat.id,
            message_id=callback_query.message.message_id,
            reply_markup=None
        )

        await callback_query.answer("✅ Доставка успешно завершена!", show_alert=True)
        
        # Отправляем финальное сообщение
        await bot.send_message(
            chat_id=courier.tg_code,
            text=f"✅ Заявка #{order.id} завершена!\n"
                 f"Статус: Доставлено\n"
                 f"Время выполнения: {order.created_at:%Y-%m-%d %H:%M}"
        )

    except OrderByClient.DoesNotExist:
        await callback_query.answer("❌ Заявка не найдена или вы не являетесь ответственным курьером!", show_alert=True)
    except Exception as e:
        print(f"Error in process_complete_client: {e}")
        await callback_query.answer("❌ Произошла ошибка!", show_alert=True)


async def send_order_notification(order: Order):
    if order.courier:
        # Отправка назначенному курьеру
        await send_courier_message(order.courier.tg_code, order)
    else:
        # Рассылка всем курьерам
        couriers = await sync_to_async(list)(Courier.objects.exclude(tg_code__isnull=True))
        for courier in couriers:
            await send_courier_message(courier.tg_code, order)

async def send_courier_message(chat_id: str, order: Order):
    try:
        text = (
            f"📦 Новый заказ #{order.id}\n"
            f"Адрес: {order.delivery_address}\n"
            f"Сумма: {order.total_price} сом"
        )
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="Взять заказ", callback_data=f"take_{order.id}")
        ]])
        
        await bot.send_message(chat_id, text, reply_markup=keyboard)
    except Exception as e:
        print(f"Ошибка отправки: {e}")

# Запуск бота
async def main():
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())