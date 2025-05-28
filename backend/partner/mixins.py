import hashlib
import random
import string
import xml.etree.ElementTree as ET
import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response


class FreedomPayMixin:
    """Mixin для создания платежной сессии и проверки статуса через FreedomPay API."""
    model = None
    amount_field = 'total_price'
    order_id_key = 'order_id'

    def generate_pg_sig(self, script_name: str, data: dict) -> str:
        """
        Формирует pg_sig для запроса к FreedomPay.

        Аргументы:
        - script_name: имя API-скрипта (например, 'init_payment.php' или 'status_v2')
        - data: словарь параметров запроса (без pg_sig)

        Возвращает:
        MD5-подпись на основе [script_name, sorted params, secret_key].
        """
        items = sorted(data.items())
        lst = [script_name] + [str(v) for _, v in items] + [settings.FREEDOMPAY_SECRET_KEY]
        return hashlib.md5(';'.join(lst).encode()).hexdigest()

    def create_session(self, request):
        """
        Инициализирует платежную сессию.

        Ожидает в request.data:
        - self.order_id_key: ID заказа

        Возвращает:
        HTTP 201 с {'payment_url': URL} при успехе,
        HTTP 502 при ошибке сети,
        HTTP 400 при ошибках API.
        """
        oid = request.data.get(self.order_id_key)
        order = get_object_or_404(self.model, pk=oid, user=request.user)

        pg_salt = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        data = {
            'pg_order_id':    str(order.id),
            'pg_merchant_id': settings.FREEDOMPAY_MERCHANT_ID,
            'pg_amount':      str(getattr(order, self.amount_field)),
            'pg_description': f'Оплата заказа №{order.id}',
            'pg_salt':        pg_salt,
        }
        data['pg_sig'] = self.generate_pg_sig('init_payment.php', data)

        try:
            resp = requests.post(settings.FREEDOMPAY_API_URL, data=data, timeout=10)
            resp.raise_for_status()
        except requests.RequestException as e:
            return Response({'detail': f'Ошибка при создании сессии: {e}'},
                            status=status.HTTP_502_BAD_GATEWAY)

        try:
            root = ET.fromstring(resp.text)
        except ET.ParseError as e:
            return Response({'detail': f'Некорректный XML в ответе: {e}'},
                            status=status.HTTP_502_BAD_GATEWAY)

        if root.findtext('pg_status') == 'ok':
            return Response({'payment_url': root.findtext('pg_redirect_url'),
                             'session_id': root.findtext('pg_session_id')},
                            status=status.HTTP_201_CREATED)
        err = root.findtext('pg_error_description') or 'Неизвестная ошибка'
        return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)

    def get_status(self, request):
        """
        Проверяет статус платежа.

        Ожидает в query_params:
        - self.order_id_key: ID заказа

        Возвращает:
        {'pg_status', 'pg_payment_status'} при успехе,
        HTTP 502 при сетевых ошибках,
        HTTP 400 при отсутствии параметра,
        HTTP 500 при ошибке парсинга.
        """
        order_id = request.query_params.get(self.order_id_key)
        if not order_id:
            return Response({'detail': f'{self.order_id_key} обязателен'},
                            status=status.HTTP_400_BAD_REQUEST)

        pg_salt = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        data = {
            'pg_merchant_id': settings.FREEDOMPAY_MERCHANT_ID,
            'pg_order_id': order_id,
            'pg_salt': pg_salt,
        }
        data['pg_sig'] = self.generate_pg_sig('status_v2', data)

        try:
            resp = requests.post(settings.FREEDOMPAY_STATUS_V2_URL, data=data, timeout=10)
            resp.raise_for_status()
        except requests.RequestException as e:
            return Response({'detail': f'Ошибка при получении статуса: {e}'},
                            status=status.HTTP_502_BAD_GATEWAY)

        try:
            root = ET.fromstring(resp.text)
        except ET.ParseError as e:
            return Response({'detail': f'Ошибка при разборе ответа: {e}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'pg_status': root.findtext('pg_status'),
            'pg_payment_status': root.findtext('pg_payment_status'),
        })
