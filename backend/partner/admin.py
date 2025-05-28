from django.contrib import admin
from .models import (
    Partner,
    StoreCategory,
    Store,
    ProductCategory,
    Product,
    StoreFavorite,
    StoreStory,
    PromoCode,
    Partner,
    Courier, 
    Order,
    OrderItem,
    OrderByClient
)


class StoreInline(admin.TabularInline):
    model = Store.partners.through  
    extra = 1
    verbose_name = "Магазин"
    verbose_name_plural = "Магазины"


class PromoInline(admin.TabularInline):
    model = PromoCode  
    extra = 1
    verbose_name = "Промокод"
    verbose_name_plural = "Промокоды"


class StoreStory(admin.TabularInline):
    model = StoreStory  
    extra = 1
    verbose_name = "Сторис"
    verbose_name_plural = "Сторисы"


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ('id', 'address', 'phone_number')
    search_fields = ('address', 'phone_number')
    inlines = [StoreInline]
    exclude = ('store_set',)  # Скрыть обратную связь в админке, если не нужна


@admin.register(StoreCategory)
class StoreCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


class ProductInline(admin.TabularInline):
    model = Product
    extra = 1


@admin.register(Courier)
class CourierAdmin(admin.ModelAdmin):
    list_display = ('id', 'phone_number', 'user')
    search_fields = ('phone_number', 'user__username')


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'delivery_address', 'courier', 'partner', 'payment_method', 'status')
    inlines = [OrderItemInline]


@admin.register(OrderByClient)
class OrderClientAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'delivery_address_a', 'delivery_address_b', 'courier', 'payment_method', 'status')


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category')
    search_fields = ('name',)
    list_filter = ('category',)
    filter_horizontal = ('partners',)
    inlines = [ProductInline, StoreStory, PromoInline]


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'store')
    list_filter = ('store',)
    search_fields = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'store', 'category')
    list_filter = ('store', 'category')
    search_fields = ('name',)


@admin.register(StoreFavorite)
class StoreFavoriteAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'store', 'created_at')
    list_filter = ('store',)
    search_fields = ('user__phone_number', 'store__name')