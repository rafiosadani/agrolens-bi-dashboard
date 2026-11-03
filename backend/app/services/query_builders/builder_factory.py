"""
Sales Query Builder Factory
Factory that instantiates the appropriate query builder strategy based on entity and database.
"""

from app.core.constants.financial_registry import normalize_entity_code
from app.services.query_builders.base_builder import BaseSalesQueryBuilder
from app.services.query_builders.amg_builder import AMGQueryBuilder
from app.services.query_builders.default_builder import DefaultSalesQueryBuilder


class SalesQueryBuilderFactory:
    """Factory for obtaining entity-specific query builders."""

    @staticmethod
    def get_builder(entity_code: str, db_name: str) -> BaseSalesQueryBuilder:
        norm = normalize_entity_code(entity_code)
        if norm == "AMG" or "AGC" in db_name:
            return AMGQueryBuilder(db_name=db_name)
        return DefaultSalesQueryBuilder(entity_code=norm, db_name=db_name)

