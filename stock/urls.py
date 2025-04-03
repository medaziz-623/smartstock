from django.urls import path
from . import views
from .views import stock_movements_list

urlpatterns = [
    # Item API
    path('api/items/', views.ItemListCreateView.as_view(), name='item-list-create'),
    path('api/items/<int:pk>/', views.ItemRetrieveUpdateDestroyView.as_view(), name='item-retrieve-update-destroy'),

    # Stock Movement API

    path('api/stock-movements/', views.StockMovementListCreateView.as_view(), name='stock-movement-list-create'),

    path('api/reset/', views.reset_inventory, name='reset-inventory'),

    path('api/stock_movements/', stock_movements_list, name='stock-movements-list'),

    path('api/monthly_reset/', views.monthly_stock_reset, name='monthly_reset'),
]