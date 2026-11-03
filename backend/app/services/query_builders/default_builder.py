"""
Default Sales Query Builder
Standard ERP and Financial query strategy for standard entities.
"""

from typing import List
from app.services.query_builders.base_builder import BaseSalesQueryBuilder


class DefaultSalesQueryBuilder(BaseSalesQueryBuilder):
    """Default strategy for standard raw ERP entities where Financial Layer mirrors Net ERP calculation."""

    def build_financial_monthly_query(self, year: int, months: List[int], segment: str = "all") -> str:
        """By default, Financial Layer mirrors the standard Net Price calculation."""
        return self.build_erp_monthly_query(year, months, segment)

