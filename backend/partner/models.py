from django.db import models
from django.contrib.auth import get_user_model
from image_cropping import ImageRatioField
from datetime import datetime 

User = get_user_model()

class Partner(models.Model):
    """
    Представляет партнера (менеджера/контрагента), к которому привязаны магазины.
    """
    name = models.CharField(max_length=255, verbose_name="Имя партнера")
    phone_number = models.CharField(max_length=15, unique=True, verbose_name="Номер телефона")

    class Meta:
        verbose_name = "Партнер"
        verbose_name_plural = "Партнеры"

    def __str__(self):
        return f"{self.name} ({self.phone_number})"


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
    Промокод для магазина.
    """
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        related_name='promo_codes',
        verbose_name="Магазин"
    )
    code = models.CharField(max_length=50, unique=True, verbose_name="Промокод")
    discount = models.PositiveIntegerField(verbose_name="Скидка в сомах")
    on_products = models.ManyToManyField(
        Product,
        related_name='promo_codes_applicable',
        verbose_name="Товары, на которые действует промокод",
        blank=True
    )
    used_by = models.ManyToManyField(
        User,
        related_name='used_promo_codes',
        verbose_name="Пользователи, использовавшие промокод",
        blank=True
    )

    class Meta:
        verbose_name = "Промокод"
        verbose_name_plural = "Промокоды"

    def __str__(self):
        return f"{self.code} — {self.store.name}"

    def is_used_by_user(self, user):
        return self.used_by.filter(id=user.id).exists()

    def mark_as_used(self, user):
        if not self.is_used_by_user(user):
            self.used_by.add(user)
            self.save()
            return True
        return False