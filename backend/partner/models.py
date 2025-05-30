from django.db import models
from django.contrib.auth import get_user_model
from image_cropping import ImageRatioField
from datetime import datetime 
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from django.db.models.signals import post_save
from django.dispatch import receiver
import threading, asyncio


User = get_user_model()


class Partner(models.Model):
    """
    Представляет партнера (менеджера/контрагента), к которому привязаны магазины.
    """
    address = models.CharField(max_length=255, verbose_name="Адрес партнера")
    phone_number = models.CharField(max_length=15, unique=True, verbose_name="Номер телефона")
    tg_code = models.CharField(max_length=255, null=True, blank=True, verbose_name="Код Telegram")


    class Meta:
        verbose_name = "Партнер"
        verbose_name_plural = "Партнеры"

    def __str__(self):
        return f"{self.address} ({self.phone_number})"


class StoreCategory(models.Model):
    """
    Глобальные категории магазинов: магазин, суши бар и т.п.
    """
    name = models.CharField(max_length=100, unique=True, verbose_name="Категория магазина")

    class Meta:
        verbose_name = "Категория магазина"
        verbose_name_plural = "Категории магазинов"

    def __str__(self):
        return self.name


class Store(models.Model):
    """
    Магазин/филиал партнера.
    """
    category = models.ForeignKey(
        StoreCategory,
        on_delete=models.SET_NULL,
        null=True,
        related_name='stores',
        verbose_name="Категория магазина"
    )
    partners = models.ManyToManyField(
        Partner,
        related_name='stores',
        verbose_name="Партнеры"
    )
    name = models.CharField(max_length=255, verbose_name="Название магазина")
    description = models.CharField(max_length=255, verbose_name="Описание магазина")
    banner = models.ImageField(upload_to='store_banners/', verbose_name="Баннер")
    opening_time = models.TimeField(verbose_name="Время открытия")
    closing_time = models.TimeField(verbose_name="Время закрытия")

    def is_open(self):
        now = datetime.now().time()
        return self.opening_time <= now <= self.closing_time

    class Meta:
        verbose_name = "Магазин"
        verbose_name_plural = "Магазины"

    def __str__(self):
        return self.name


class ProductCategory(models.Model):
    """
    Локальные категории товаров внутри конкретного магазина.
    """
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        related_name='product_categories',
        verbose_name="Магазин"
    )
    name = models.CharField(max_length=100, verbose_name="Категория товара")

    class Meta:
        unique_together = ('store', 'name')
        verbose_name = "Категория товара"
        verbose_name_plural = "Категории товаров"

    def __str__(self):
        return f"{self.store.name} — {self.name}"


class Product(models.Model):
    """
    Товар в магазине.
    """
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name="Магазин"
    )
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.SET_NULL,
        null=True,
        related_name='products',
        verbose_name="Категория товара"
    )
    name = models.CharField(max_length=255, verbose_name="Название товара")
    description = models.CharField(max_length=255, verbose_name="Мини-описание")
    image = models.ImageField(upload_to='product_images/', verbose_name="Изображение товара")
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Цена")

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"

    def __str__(self):
        return f"{self.name} — {self.store.name}"


class StoreFavorite(models.Model):
    """
    Система "лайков"/избранного для магазинов.
    Пользователь нажимает сердце — магазин в "избранном".
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorite_stores',
        verbose_name="Пользователь"
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        related_name='favorited_by',
        verbose_name="Магазин"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата добавления")

    class Meta:
        unique_together = ('user', 'store')
        verbose_name = "Избранный магазин"
        verbose_name_plural = "Избранные магазины"

    def __str__(self):
        return f"{self.user.phone_number} ❤ {self.store.name}"


class StoreStory(models.Model):
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        related_name='stories',
        verbose_name="Магазин"
    )
    icon = models.ImageField(upload_to='store_stories/icons/', verbose_name="Иконка (1:1)")
    icon_cropping = ImageRatioField('icon', '600x600')

    image = models.ImageField(upload_to='store_stories/full/', verbose_name="Изображение для экрана")
    image_cropping = ImageRatioField('image', '1080x1920')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Сторис магазина"
        verbose_name_plural = "Сторисы магазинов"

    def __str__(self):
        return f"Story for {self.store.name} (#{self.pk})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.store.stories.count() >= 5 and not self.pk:
            raise ValidationError("У каждого магазина может быть не более 5 сторисов.")
        

class PromoCode(models.Model):
    """
    Промокод для магазина с поддержкой минимальной суммы, срока действия и ограничений по использованию.
    """
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        related_name='promo_codes',
        verbose_name="Магазин"
    )
    code = models.CharField(max_length=50, unique=True, verbose_name="Промокод")
    discount_amount = models.PositiveIntegerField(verbose_name="Скидка в сомах")
    min_order_sum = models.PositiveIntegerField(default=0, verbose_name="Мин. сумма заказа")
    valid_from = models.DateTimeField(default=timezone.now, verbose_name="Действует с")
    valid_until = models.DateTimeField(verbose_name="Действует до")
    usage_limit = models.PositiveIntegerField(null=True, blank=True, verbose_name="Лимит использований")
    used_count = models.PositiveIntegerField(default=0, verbose_name="Сколько раз использован")
    on_products = models.ManyToManyField(
        Product,
        related_name='promo_codes_applicable',
        verbose_name="Товары, на которые действует промокод",
        blank=True
    )
    users_used = models.ManyToManyField(
        User,
        related_name='used_promo_codes',
        verbose_name="Пользователи, использовавшие промокод",
        blank=True
    )

    class Meta:
        verbose_name = "Промокод"
        verbose_name_plural = "Промокоды"

    def __str__(self):
        return f"{self.code} ({self.store.name})"

    def is_active(self):
        now = timezone.now()
        if self.valid_from > now or self.valid_until < now:
            return False
        if self.usage_limit is not None and self.used_count >= self.usage_limit:
            return False
        return True

    def can_user_use(self, user):
        return self.is_active() and not self.users_used.filter(pk=user.pk).exists()

    def apply(self, user, order_total, order_products):
        """
        Проверяет возможность применения и возвращает сумму после скидки.
        order_products: queryset or list of Product instances.
        """
        if order_total < self.min_order_sum:
            raise ValueError(f"Минимальная сумма заказа {self.min_order_sum} сом.")
        if not self.is_active():
            raise ValueError("Промокод неактивен.")
        if not self.can_user_use(user):
            raise ValueError("Вы уже использовали этот промокод.")
        # проверяем товары: если on_products не пуст, хотя бы один товар должен быть в заказе
        applicable = self.on_products.exists()
        if applicable:
            matched = any(p.pk in [o.pk for o in order_products] for p in self.on_products.all())
            if not matched:
                raise ValueError("Промокод не подходит ни к одному из товаров в заказе.")
        # считаем скидку
        discounted = max(order_total - self.discount_amount, 0)
        return discounted

    def mark_used(self, user):
        self.users_used.add(user)
        self.used_count = models.F('used_count') + 1
        self.save(update_fields=['used_count'])
    

class Courier(models.Model):
    """
    Модель курьера с полем номера телефона.
    """
    phone_number = models.CharField(max_length=15, unique=True, verbose_name="Номер телефона курьера")
    user =models.CharField(max_length=255, null=True, blank=True, verbose_name="Имя курьера")
    tg_code = models.CharField(max_length=255, null=True, blank=True, verbose_name="Код Telegram")

    class Meta:
        verbose_name = "Курьер"
        verbose_name_plural = "Курьеры"

    def __str__(self):
        return self.phone_number


class Order(models.Model):
    PAYMENT_CHOICES = [
        ('qr', 'QR'),
        ('freedom', 'Freedom Pay'),
        ('cash', 'Наличкой'),
    ]
    STATUS_CHOICES = [
        ('waiting', 'Ожидание'),
        ('en_route', 'В пути'),
        ('delivered', 'Доставлено'),
    ]

    user             = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', verbose_name="Пользователь")
    total_price      = models.PositiveBigIntegerField(verbose_name='Сумма заказа')
    created_at       = models.DateTimeField(auto_now_add=True, verbose_name="Дата заказа")
    delivery_address = models.CharField(max_length=512, verbose_name="Адрес доставки")
    courier          = models.ForeignKey(Courier, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    partner          = models.ForeignKey(Partner, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    payment_method   = models.CharField(max_length=10, choices=PAYMENT_CHOICES, verbose_name="Метод оплаты")
    status           = models.CharField(max_length=10, choices=STATUS_CHOICES, default='waiting', verbose_name="Статус заказа")
    notified_couriers = models.ManyToManyField(
        Courier, 
        blank=True,
        verbose_name="Уведомленные курьеры"
    )
    promocode_used = models.ForeignKey(
        PromoCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order',
        verbose_name="Использованный промокод"
    )
    paid = models.BooleanField(default=False, verbose_name="Оплачен")

    def get_status_display(self):
        return dict(self.STATUS_CHOICES).get(self.status, self.status)
    
    def get_user_display(self):
        return f'{self.user.phone_number} ({self.user.name})' if self.user else 'Неизвестный пользователь'

    def __str__(self):
        return f"Заказ #{self.id} — {self.get_status_display()}"
    
    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"


class OrderByClient(models.Model):
    PAYMENT_CHOICES = [
        ('qr', 'QR'),
        ('freedom', 'Freedom Pay'),
        ('cash', 'Наличкой'),
    ]
    STATUS_CHOICES = [
        ('waiting', 'Ожидание'),
        ('en_route', 'В пути'),
        ('delivered', 'Доставлено'),
    ]

    user             = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders_client', verbose_name="Пользователь")
    delivery_price      = models.PositiveBigIntegerField(verbose_name='Цена доставки')
    created_at       = models.DateTimeField(auto_now_add=True, verbose_name="Дата заказа")
    delivery_address_a = models.CharField(max_length=512, verbose_name="Точка А")
    delivery_address_b = models.CharField(max_length=512, verbose_name="Точка Б")
    courier          = models.ForeignKey(Courier, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders_client')
    payment_method   = models.CharField(max_length=10, choices=PAYMENT_CHOICES, verbose_name="Метод оплаты")
    status           = models.CharField(max_length=10, choices=STATUS_CHOICES, default='waiting', verbose_name="Статус заказа")
    comment          = models.TextField(null=True, blank=True, verbose_name="Комментарий к заказу")
    notified_couriers = models.ManyToManyField(
        Courier, 
        blank=True,
        verbose_name="Уведомленные курьеры"
    )
    paid = models.BooleanField(default=False, verbose_name="Оплачен")

    def get_status_display(self):
        return dict(self.STATUS_CHOICES).get(self.status, self.status)
    
    def get_user_display(self):
        return f'{self.user.phone_number} ({self.user.name})' if self.user else 'Неизвестный пользователь'

    def __str__(self):
        return f"Заказ #{self.id} — {self.get_status_display()}"
    
    class Meta:
        verbose_name = "Собственный заказ"
        verbose_name_plural = "Собственные заказы"


class OrderItem(models.Model):
    order    = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product  = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='order_items')
    quantity = models.PositiveIntegerField(default=1, verbose_name="Количество")

    class Meta:
        unique_together = ('order', 'product')
        verbose_name = "Продукт"
        verbose_name_plural = "Продукты"

    def __str__(self):
        return f"{self.product.name} × {self.quantity}"
    

@receiver(post_save, sender=OrderByClient)
def on_order_by_client_created(sender, instance, created, **kwargs):
    if created:
        from .tasks import send_client_order_notifications_task
        send_client_order_notifications_task.delay(instance.id)


@receiver(post_save, sender=Order)
def on_order_created(sender, instance, created, **kwargs):
    if created:
        from .tasks import send_order_notifications_task
        send_order_notifications_task.delay(instance.id)
