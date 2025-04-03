# stock/models.py
from django.db import models

class Item(models.Model):
    name = models.CharField(max_length=100)
    quantity = models.IntegerField()  # Keep this field
    item_type = models.CharField(max_length=1, choices=[('A', 'Type A'), ('B', 'Type B'), ('C', 'Type C')])
    @property
    def alert_threshold(self):
        return {
            'A': 100,
            'B': 50,
            'C': 20
        }.get(self.item_type, 100)  # Default to 100 if type not found

class StockMovement(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity_added = models.IntegerField(default=0)
    quantity_removed = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)
    period_start = models.DateField()
    period_end = models.DateField()
    remaining_stock = models.IntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['period_start', 'period_end']),
        ]