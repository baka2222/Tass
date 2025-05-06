from rest_framework import serializers
from .models import Advertisement
from image_cropping.utils import get_thumbnail


class RegisterSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)


class VerifyCodeSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    code = serializers.CharField(max_length=6)


class AdvertisementSerializer(serializers.ModelSerializer):
    """
    Сериализатор для рекламы:
    - id
    - title
    - image: оригинальная картинка (URL)
    - cropped: кропнутый баннер по соотношению 3:1
    - created_at
    """
    image = serializers.SerializerMethodField()
    cropped = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = ['id', 'title', 'image', 'cropped', 'created_at']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_cropped(self, obj):
        request = self.context.get('request')
        if obj.image and obj.cropping:
            thumb = get_thumbnail(
                obj.image,
                obj.cropping,
                box=obj.cropping,
                crop=True,
                upscale=False
            )
            return request.build_absolute_uri(thumb.url)
        return None