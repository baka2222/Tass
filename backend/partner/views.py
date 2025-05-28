from django.db.models import Count, Prefetch
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView, RetrieveAPIView
from .models import Store, StoreCategory, StoreFavorite, PromoCode
from .serializers import (
    StoreSerializer,
    StoreCategoryWithStoresSerializer,
    StoreDetailSerializer,
    PromoCodeSerializer,
    OrderClientSerializer
)
from .models import Partner, Courier, Order, OrderByClient
from .serializers import PartnerSerializer, CourierSerializer, OrderSerializer
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.decorators import api_view, permission_classes
from django.conf import settings
from django.shortcuts import get_object_or_404
from .mixins import FreedomPayMixin


class CreateStoreOrderPayment(FreedomPayMixin, APIView):
    permission_classes = [IsAuthenticated]
    model = Order
    amount_field = 'total_price'
    order_id_key = 'order_id'  # можно оставить

    def post(self, request, *args, **kwargs):
        return self.create_session(request)


class StoreOrderPaymentStatus(FreedomPayMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return self.get_status(request)


class CreateClientOrderPayment(FreedomPayMixin, APIView):
    permission_classes = [IsAuthenticated]
    model = OrderByClient
    amount_field = 'delivery_price'  # или как у вас называется
    order_id_key = 'client_order_id'  # чтобы не путать

    def post(self, request, *args, **kwargs):
        return self.create_session(request)


class ClientOrderPaymentStatus(FreedomPayMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return self.get_status(request)


class OrderByUserId(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    queryset = Order.objects.all()

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Order.objects.filter(user_id=user_id).order_by('-created_at')[:25]
    

class OrderClientByUserId(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderClientSerializer
    queryset = OrderByClient.objects.all()

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return OrderByClient.objects.filter(user_id=user_id).order_by('-created_at')[:25]


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user

    if request.method == 'GET':
        return Response({
            'id': user.id,
            'phone_number': user.phone_number,
            'name': getattr(user, 'name', '')
        })

    name = request.data.get('name')
    if name is None:
        return Response(
            {'detail': 'Поле name обязательно для обновления.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.name = name
    user.save(update_fields=['name'])

    return Response({
        'id': user.id,
        'phone_number': user.phone_number,
        'name': user.name
    }, status=status.HTTP_200_OK)


class PartnerViewSet(viewsets.ModelViewSet):
    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'phone_number']


class CourierViewSet(viewsets.ModelViewSet):
    queryset = Courier.objects.all()
    serializer_class = CourierSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['phone_number']


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related('courier', 'partner').prefetch_related('items')
    serializer_class = OrderSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['delivery_address', 'status', 'payment_method']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # сохраняем экземпляр
        self.perform_create(serializer)
        instance = serializer.instance
        # возвращаем только id (или любые другие данные)
        return Response(
            {'id': instance.id},
            status=status.HTTP_201_CREATED
        )


class OrderClientViewSet(viewsets.ModelViewSet):
    queryset = OrderByClient.objects.select_related('courier')
    serializer_class = OrderClientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['delivery_address_a', 'delivery_address_b', 'status', 'payment_method']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # сохраняем экземпляр
        self.perform_create(serializer)
        instance = serializer.instance
        # возвращаем только id (или любые другие данные)
        return Response(
            {'id': instance.id},
            status=status.HTTP_201_CREATED
        )


class PromoCodeViewSet(viewsets.ModelViewSet):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_used(self, request, pk=None):
        promo = self.get_object()
        try:
            promo.mark_used(request.user)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': 'used'})


class StoreLikeAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({'detail': 'Store not found.'}, status=status.HTTP_404_NOT_FOUND)
        fav, created = StoreFavorite.objects.get_or_create(user=request.user, store=store)
        if not created:
            return Response({'detail': 'Already liked.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Store liked successfully.'}, status=status.HTTP_201_CREATED)


class StoreLikeRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, store_id):
        deleted, _ = StoreFavorite.objects.filter(user=request.user, store_id=store_id).delete()
        if deleted:
            return Response({'detail': 'Like removed.'}, status=status.HTTP_204_NO_CONTENT)
        return Response({'detail': 'Like not found.'}, status=status.HTTP_404_NOT_FOUND)


class StoreListGroupedByCategoryView(ListAPIView):
    """
    Список категорий + топ-4 популярных магазинов в отдельной категории.
    GET /stores/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = StoreCategoryWithStoresSerializer

    def get_queryset(self):
        return StoreCategory.objects.prefetch_related('stores__favorited_by')

    def list(self, request, *args, **kwargs):
        top_stores = Store.objects.annotate(
            likes=Count('favorited_by')
        ).order_by('-likes')[:4]

        top_data = {
            'id': 0,
            'name': 'Популярные',
            'stores': StoreSerializer(
                top_stores,
                many=True,
                context={'request': request}
            ).data
        }

        categories = self.get_queryset()
        cat_data = self.get_serializer(
            categories,
            many=True,
            context={'request': request}
        ).data

        return Response([top_data] + cat_data)


class StoreDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = StoreDetailSerializer
    lookup_url_kwarg = 'store_id'
    queryset = Store.objects.prefetch_related(
        'product_categories__products', 'promo_codes', 'stories'
    )

    def get_serializer_context(self):
        return {'request': self.request}
