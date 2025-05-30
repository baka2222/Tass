# partner/tasks.py
from celery import shared_task
from .models import Courier, OrderByClient, Order
from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
import os
import asyncio
from telegram_bot import bot

def _send_message(chat_id: str, text: str, reply_markup=None):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        coro = bot.send_message(chat_id, text, reply_markup=reply_markup)
        loop.run_until_complete(coro)
    finally:
        loop.run_until_complete(bot.session.close())
        loop.close()

@shared_task
def send_client_order_notifications_task(order_id: int):
    order = OrderByClient.objects.get(pk=order_id)
    # собираем список курьеров
    couriers = ([order.courier] if order.courier
                else list(Courier.objects.exclude(tg_code__isnull=True)))
    for courier in couriers:
        text = (
            f"🚚 Новая заявка #{order.id}\n"
            f'Клиент: {order.get_user_display()}\n'
            f"A: {order.delivery_address_a}\n"
            f"B: {order.delivery_address_b}\n"
            f"Цена: {order.delivery_price} сом\n"
            f"{order.comment or 'Комментарий не указан'}\n"
            f"Оплата: {order.get_payment_method_display()}"
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="Взять заявку", callback_data=f"client_take_{order.id}")
        ]])
        _send_message(courier.tg_code, text, reply_markup=kb)

@shared_task
def send_order_notifications_task(order_id: int):
    order = Order.objects.get(pk=order_id)
    couriers = ([order.courier] if order.courier
                else list(Courier.objects.exclude(tg_code__isnull=True)))
    for courier in couriers:
        text = (f"📦 Новый заказ #{order.id}\n"
                f"Клиент: {order.get_user_display()}\n"
                f"Адрес: {order.delivery_address}\n"
                f"Сумма: {order.total_price} сом")
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="Взять заказ", callback_data=f"take_{order.id}")
        ]])
        _send_message(courier.tg_code, text, reply_markup=kb)
