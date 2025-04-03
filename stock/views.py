from rest_framework import generics ,status
from django.views.decorators.csrf import csrf_exempt
from .models import Item, StockMovement
from .serializers import ItemSerializer, StockMovementSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import render
from dateutil.relativedelta import relativedelta
from django.db import transaction
# Item API

class ItemListCreateView(generics.ListCreateAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

    def perform_create(self, serializer):
        name = serializer.validated_data.get('name')
        if Item.objects.filter(name=name).exists():
            raise serializer.ValidationError({"name": "This item already exists."})

        item = serializer.save()
        StockMovement.objects.create(
            item=item,
            quantity_added=item.quantity,
            quantity_removed=0
        )
class ItemRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

    def perform_update(self, serializer):
        item = self.get_object()
        new_quantity = self.request.data.get("quantity", item.quantity)

        # Determine if the quantity increased or decreased
        quantity_diff = new_quantity - item.quantity

        if quantity_diff > 0:
            StockMovement.objects.create(item=item, quantity_added=quantity_diff)
        elif quantity_diff < 0:
            StockMovement.objects.create(item=item, quantity_removed=abs(quantity_diff))

        serializer.save()

# Stock Movement API
class StockMovementListCreateView(generics.ListCreateAPIView):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer



def index(request):
    return render(request, 'stock/index.html')

def perform_create(self, serializer):
        # Log the data being added
        print("Adding new item:", self.request.data)
        serializer.save()

def perform_update(self, serializer):
        # Log the data being updated
        print("Updating item:", self.request.data)
        serializer.save()

def perform_destroy(self, instance):
        # Log the item being deleted
        print("Deleting item:", instance)
        instance.delete()

@api_view(['DELETE'])
def reset_inventory(request):
    Item.objects.all().delete()  # Delete all items
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
def stock_movements_list(request):
    current_date = timezone.now().date()
    current_month_start = current_date.replace(day=1)
    current_month_end = (current_month_start + relativedelta(months=1)) - timedelta(days=1)

    items = Item.objects.all()
    result = []

    for item in items:
        current_movement = StockMovement.objects.filter(
            item=item,
            period_start__lte=current_date,
            period_end__gte=current_date
        ).first()

        if not current_movement:
            current_movement = StockMovement.objects.create(
                item=item,
                period_start=current_month_start,
                period_end=current_month_end,
                remaining_stock=item.quantity,
                quantity_added=0,
                quantity_removed=0
            )

        result.append({
            'name': item.name,
            'opening_stock': current_movement.remaining_stock - current_movement.quantity_added + current_movement.quantity_removed,
            'current_added': current_movement.quantity_added,
            'current_removed': current_movement.quantity_removed,
            'current_stock': current_movement.remaining_stock,
            'alert_threshold': item.alert_threshold,
            'month_start': current_movement.period_start.strftime("%d/%m/%Y"),
            'month_end': current_movement.period_end.strftime("%d/%m/%Y")
        })

    return Response(result)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def monthly_stock_reset(request):
    try:
        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        items = Item.objects.all()

        for item in items:
            # Create new monthly record
            StockMovement.objects.create(
                item=item,
                period_start=current_month_start,
                period_end=current_month_start + relativedelta(months=1) - timedelta(days=1),
                remaining_stock=item.quantity,
                quantity_added=0,
                quantity_removed=0
            )

            # Reset item quantity for new month
            item.quantity = 0
            item.save()

        return Response({"status": "Monthly reset completed successfully"})

    except Exception as e:
        return Response({"error": str(e)}, status=500)