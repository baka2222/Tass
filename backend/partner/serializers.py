from django.db.models import Count
from rest_framework import serializers
from easy_thumbnails.files import get_thumbnailer
from .models import (
    Store,
    StoreCategory,
    ProductCategory,
    Product,
    StoreStory,
    PromoCode,
)


class StoreSerializer(serializers.ModelSerializer):
    banner = serializers.SerializerMethodField()
    likes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Store
        fields = ['id', 'name', 'banner', 'category', 'likes', 'description', 'is_open']

    def get_banner(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.banner.url) if obj.banner else None
    
    def get_is_open(self, obj):
        return obj.is_open()


class StoreCategoryWithStoresSerializer(serializers.ModelSerializer):
    stores = serializers.SerializerMethodField()

    class Meta:
        model = StoreCategory
        fields = ['id', 'name', 'stores']

    def get_stores(self, obj):
        qs = obj.stores.annotate(likes=Count('favorited_by')).order_by('-likes')
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
            thumbnailer = get_thumbnailer(obj.icon)
            thumb = thumbnailer.get_thumbnail({
                'size': (150, 150),
                'box': obj.icon_cropping,
                'crop': True,
                'upscale': True,
            })
            return request.build_absolute_uri(thumb.url)
        return None

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and obj.image_cropping:
            thumbnailer = get_thumbnailer(obj.image)
            thumb = thumbnailer.get_thumbnail({
                'size': (1080, 1920),
                'box': obj.image_cropping,
                'crop': True,
                'upscale': True,
            })
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
    products = ProductSerializer(many=True)

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
        many=True, read_only=True
    )
    promocodes = PromoCodeSerializer(many=True, read_only=True)
    stories = StorySerializer(many=True, read_only=True)

    class Meta:
        model = Store
        fields = ['id', 'name', 'description', 'banner', 'product_categories', 'promocodes', 'stories', 'is_open']

    def get_banner(self, obj):
        request = self.context.get('request')
        if obj.banner:
            return request.build_absolute_uri(obj.banner.url)
        return None
