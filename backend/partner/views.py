from django.db.models import Count, Prefetch
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.generics import ListAPIView, RetrieveAPIView
from .models import Store, StoreCategory, StoreFavorite
from .serializers import (
    StoreSerializer,
    StoreCategoryWithStoresSerializer,
    StoreDetailSerializer,
)


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
    permission_classes = [AllowAny]
    serializer_class = StoreCategoryWithStoresSerializer

    def get_queryset(self):
        return StoreCategory.objects.prefetch_related('stores__favorited_by')

    def list(self, request, *args, **kwargs):
        top_stores = Store.objects.annotate(
            likes=Count('favorited_by')
        ).order_by('-likes')[:4]

        top_data = {
            'id': 0,
            'name': 'Топ',
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
    permission_classes = [AllowAny]
    serializer_class = StoreDetailSerializer
    lookup_url_kwarg = 'store_id'
    queryset = Store.objects.prefetch_related(
        'product_categories__products', 'promo_codes', 'stories'
    )

    def get_serializer_context(self):
        return {'request': self.request}
