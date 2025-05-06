from django.contrib import admin
from .models import (
    Partner,
    StoreCategory,
    Store,
    ProductCategory,
    Product,
    StoreFavorite
)


class StoreInline(admin.TabularInline):
    model = Store.partners.through  # Через M2M связь
    extra = 1
    verbose_name = "Магазин"
    verbose_name_plural = "Магазины"


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'phone_number')
    search_fields = ('name', 'phone_number')
    inlines = [StoreInline]
    exclude = ('store_set',)  # Скрыть обратную связь в админке, если не нужна


@admin.register(StoreCategory)
class StoreCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


class ProductInline(admin.TabularInline):
    model = Product
    extra = 1


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category')
    search_fields = ('name',)
    list_filter = ('category',)
    filter_horizontal = ('partners',)
    inlines = [ProductInline]


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
