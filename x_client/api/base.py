"""
Base API module for X API client.

This module provides the base class for all API modules.
"""
import json
from abc import ABC
from typing import Any, Dict, Optional

from ..http import HTTPClient


class BaseAPI(ABC):
    """
    Base class for API modules.
    
    Provides common functionality for making API requests
    and handling responses.
    """
    
    def __init__(self, http_client: HTTPClient):
        """
        Initialize API module.
        
        Args:
            http_client: HTTP client for making requests
        """
        self._http = http_client
    
    def _build_params(
        self,
        variables: Dict[str, Any],
        features: str,
        field_toggles: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Build query parameters for GraphQL API requests.
        
        Args:
            variables: Variables dictionary
            features: Features JSON string
            field_toggles: Optional field toggles JSON string
            
        Returns:
            Dictionary of query parameters
        """
        params = {
            "variables": json.dumps(variables, separators=(',', ':')),
            "features": features,
        }
        if field_toggles:
            params["fieldToggles"] = field_toggles
        return params
    
    def _get(self, path: str, params: Optional[Dict[str, str]] = None):
        """
        Make a GET request to the API.
        
        Args:
            path: API endpoint path
            params: Query parameters
            
        Returns:
            Response data dictionary
        """
        response = self._http.get(path, params=params)
        return response.data
    
    def _post(self, path: str, json_data: Optional[Dict[str, Any]] = None, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, str]] = None):
        """
        Make a POST request to the API.
        
        Args:
            path: API endpoint path
            json_data: JSON body
            data: Form data
            params: Query parameters
            
        Returns:
            Response data dictionary
        """
        response = self._http.post(path, json_data=json_data, data=data, params=params)
        return response.data
