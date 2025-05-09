import random
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
import requests
from .models import ClientUser, Advertisement
from .serializers import RegisterSerializer, VerifyCodeSerializer, AdvertisementSerializer

# Infobip credentials and base URL
INFOBIP_API_KEY = '023d63746427b1ebd72704a043301e8b-df0f555f-11b6-4ca2-acbc-ab17d3d96c75'
INFOBIP_BASE_URL = 'https://qd9le2.api.infobip.com'
INFOBIP_SENDER = '+447491163443'  # Отправитель (номер, подтвержденный в Infobip)

class RegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone_number']

        # Generate 5-digit code
        code = f"{random.randint(10000, 99999)}"
        cache.set(f"sms_{phone}", code, timeout=300)

        # Prepare Infobip SMS payload
        url = f"{INFOBIP_BASE_URL}/sms/2/text/advanced"
        headers = {
            'Authorization': f'App {INFOBIP_API_KEY}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        payload = {
            'messages': [
                {
                    'from': INFOBIP_SENDER,
                    'destinations': [{'to': phone}],
                    'text': f'Ваш код подтверждения: {code}'
                }
            ]
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code in (200, 201, 202):
                return Response({'detail': 'Код отправлен по SMS.'}, status=status.HTTP_200_OK)
            else:
                return Response({'detail': f'Ошибка SMS: {response.text}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'detail': f'Ошибка при отправке SMS: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AuthTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone_number']
        code = serializer.validated_data['code']
        cached = cache.get(f"sms_{phone}")
        if cached != code:
            return Response({'detail': 'Неверный код.'}, status=status.HTTP_400_BAD_REQUEST)
        user, _ = ClientUser.objects.get_or_create(phone_number=phone)
        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh)}, status=status.HTTP_200_OK)


class ProtectedRandomView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'random_number': random.randint(0, 100)}, status=status.HTTP_200_OK)
    

class AdvertisementListView(ListAPIView):
    """
    Список всех реклам (последние первыми).
    GET /ads/
    """
    queryset = Advertisement.objects.order_by('-created_at')
    serializer_class = AdvertisementSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context
