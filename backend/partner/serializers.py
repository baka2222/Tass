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
    OrderByClient
)
from .models import Partner, Courier, Order, Product, OrderItem
from django.utils import timezone
from django.contrib.auth import get_user_model


User = get_user_model()


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
    store = serializers.PrimaryKeyRelatedField(read_only=True)
    on_products = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Product.objects.all(),
        required=False
    )
    valid_from = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    valid_until = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%SZ')
    code = serializers.CharField(max_length=50)

    class Meta:
        model = PromoCode
        fields = [
            'id', 'store', 'code', 'discount_amount', 'min_order_sum',
            'valid_from', 'valid_until', 'usage_limit', 'used_count',
            'on_products', 'users_used'
        ]
        read_only_fields = ['id', 'store', 'used_count']

    def validate(self, attrs):
        if attrs.get('valid_until') <= attrs.get('valid_from', timezone.now()):
            raise serializers.ValidationError("Дата окончания должна быть позже даты начала.")
        return attrs

    def create(self, validated_data):
        on_products = validated_data.pop('on_products', [])
        promo = PromoCode.objects.create(**validated_data)
        promo.on_products.set(on_products)
        return promo


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
    

class PartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        fields = ['id', 'address', 'phone_number']


class CourierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Courier
        fields = ['id', 'phone_number', 'user']


class OrderItemSerializer(serializers.ModelSerializer):
    # Read full nested product and include store data, write by product ID
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), write_only=True)
    product_detail = serializers.SerializerMethodField(read_only=True)
    store = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'product_detail', 'store']

    def get_product_detail(self, obj):
        return ProductSerializer(obj.product, context=self.context).data

    def get_store(self, obj):
        from .serializers import StoreSerializer
        return StoreSerializer(obj.product.store, context=self.context).data

class OrderSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    items = OrderItemSerializer(many=True)
    promocode_used = serializers.PrimaryKeyRelatedField(
        queryset=PromoCode.objects.all(),
        required=False,
        allow_null=True
    )
    promocode_used_detail = PromoCodeSerializer(read_only=True, source='promocode_used')
    courier = CourierSerializer(read_only=True)
    partner = PartnerSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'total_price', 'delivery_address', 'payment_method',
            'status', 'items', 'courier', 'partner', 'promocode_used', 'paid', 'created_at', 'promocode_used_detail'
        ]
        read_only_fields = ['id', 'courier', 'partner']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        promocode = validated_data.pop('promocode_used', None)
        order = Order.objects.create(**validated_data)
        if promocode:
            order.promocode_used = promocode
            order.save(update_fields=['promocode_used'])
        for item_data in items_data:
            prod = item_data.pop('product')
            OrderItem.objects.create(order=order, product=prod, **item_data)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        promocode = validated_data.pop('promocode_used', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if promocode is not None:
            instance.promocode_used = promocode
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                prod = item_data.pop('product')
                OrderItem.objects.create(order=instance, product=prod, **item_data)
        return instance
    

class OrderClientSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    courier = CourierSerializer(read_only=True)

    class Meta:
        model = OrderByClient
        fields = [
            'id', 'user', 'delivery_price', 'delivery_address_a', 'delivery_address_b', 'payment_method',
            'status', 'courier', 'comment', 'paid', 'created_at'
        ]
        read_only_fields = ['id', 'courier']

