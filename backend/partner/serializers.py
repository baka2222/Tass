from django.db.models import Count
from rest_framework import serializers
from image_cropping.utils import get_thumbnail

from .models import (
    Store,
    StoreCategory,
    ProductCategory,
    Product,
    StoreStory,
    PromoCode,
)


class StoreSerializer(serializers.ModelSerializer):
    """
    Сериализатор для краткой информации о магазине.
    Включает абсолютный URL баннера и подсчёт лайков.
    """
    banner = serializers.SerializerMethodField()
    likes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Store
        fields = ['id', 'name', 'banner', 'category', 'likes']

    def get_banner(self, obj):
        request = self.context.get('request')
        if obj.banner:
            return request.build_absolute_uri(obj.banner.url)
        return None


class StoreCategoryWithStoresSerializer(serializers.ModelSerializer):
    """
    Категория магазинов с вложенными магазинами.
    """
    stores = serializers.SerializerMethodField()

    class Meta:
        model = StoreCategory
        fields = ['id', 'name', 'stores']

    def get_stores(self, obj):
        qs = obj.stores.annotate(likes=Count('favorites')).order_by('-likes')
        return StoreSerializer(qs, many=True, context=self.context).data


class PromoCodeSerializer(serializers.ModelSerializer):
    """
    Сериализатор для промокодов магазина.
    """
    class Meta:
        model = PromoCode
        fields = ['id', 'code', 'discount']


class StorySerializer(serializers.ModelSerializer):
    """
    Сериализатор сторис магазина: возвращает URL обрезанных иконки и полного изображения.
    """
    icon = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = StoreStory
        fields = ['id', 'icon', 'image']

    def get_icon(self, obj):
        request = self.context.get('request')
        if obj.icon and obj.icon_cropping:
            thumb = get_thumbnail(obj.icon, obj.icon_cropping, box=obj.icon_cropping, crop=True, upscale=True)
            return request.build_absolute_uri(thumb.url)
        return None

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and obj.image_cropping:
            thumb = get_thumbnail(obj.image, obj.image_cropping, box=obj.image_cropping, crop=True, upscale=True)
            return request.build_absolute_uri(thumb.url)
        return None


class ProductSerializer(serializers.ModelSerializer):
    """
    Сериализатор для товара.
    """
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'image', 'price']


class ProductCategoryWithProductsSerializer(serializers.ModelSerializer):
    """
    Сериализатор категории товаров с вложенным списком продуктов.
    """
    products = ProductSerializer(many=True, source='products')

    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'products']


class StoreDetailSerializer(serializers.ModelSerializer):
    """
    Детальный сериализатор магазина.
    Включает баннер, категории продуктов, промокоды и сторис.
    """
    banner = serializers.SerializerMethodField()
    product_categories = ProductCategoryWithProductsSerializer(
        many=True, source='product_categories', read_only=True
    )
    promocodes = PromoCodeSerializer(many=True, source='promo_codes', read_only=True)
    stories = StorySerializer(many=True, source='stories', read_only=True)

    class Meta:
        model = Store
        fields = ['id', 'name', 'description', 'banner', 'product_categories', 'promocodes', 'stories']

    def get_banner(self, obj):
        request = self.context.get('request')
        if obj.banner:
            return request.build_absolute_uri(obj.banner.url)
        return None
