#!/usr/bin/env python3
"""
Test script for admin portal APIs
Tests all admin endpoints with real Cognito authentication
"""

import json
import boto3
import requests
from datetime import datetime

# Configuration
USER_POOL_ID = "us-west-2_F4rwE0BpC"
CLIENT_ID = "42vl26qpi5kkch11ejg1747mj8"
USERNAME = "hkoneti@asu.edu"
PASSWORD = "Admin123456!"
REGION = "us-west-2"
API_URL = "https://tuvw7wkl4l.execute-api.us-west-2.amazonaws.com/prod"

def get_user_pool_client_id():
    """Get the Cognito User Pool Client ID"""
    return CLIENT_ID

def get_api_gateway_url():
    """Get the API Gateway URL"""
    return API_URL

def authenticate():
    """Authenticate with Cognito and get JWT token"""
    cognito = boto3.client('cognito-idp', region_name=REGION)
    client_id = get_user_pool_client_id()

    if not client_id:
        print("❌ Could not find User Pool Client ID")
        return None

    print(f"✅ User Pool Client ID: {client_id}")

    try:
        response = cognito.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=client_id,
            AuthFlow='ADMIN_USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': USERNAME,
                'PASSWORD': PASSWORD
            }
        )

        id_token = response['AuthenticationResult']['IdToken']
        print(f"✅ Successfully authenticated as {USERNAME}")
        return id_token
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return None

def test_session_logs_api(api_url, token):
    """Test the session logs API endpoint"""
    print("\n" + "="*60)
    print("Testing Session Logs API")
    print("="*60)

    endpoint = f"{api_url}/session-logs"
    headers = {'Authorization': f'Bearer {token}'}

    try:
        # Test with different timeframes
        for timeframe in ['today', 'weekly', 'monthly']:
            print(f"\n📊 Fetching {timeframe} session logs...")
            response = requests.get(
                endpoint,
                headers=headers,
                params={'timeframe': timeframe},
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Status: {response.status_code}")
                print(f"   📝 Conversations: {len(data.get('conversations', []))}")
                print(f"   😊 Sentiment: Positive={data.get('sentiment', {}).get('positive', 0)}, "
                      f"Neutral={data.get('sentiment', {}).get('neutral', 0)}, "
                      f"Negative={data.get('sentiment', {}).get('negative', 0)}")
                print(f"   ⭐ Avg Satisfaction: {data.get('avg_satisfaction', 0)}")

                # Show sample conversation
                if data.get('conversations'):
                    conv = data['conversations'][0]
                    print(f"\n   Sample conversation:")
                    print(f"   - Session: {conv.get('session_id', 'N/A')[:20]}...")
                    print(f"   - Query: {conv.get('query', 'N/A')[:50]}...")
                    print(f"   - Sentiment: {conv.get('sentiment', 'N/A')}")
                    print(f"   - Score: {conv.get('satisfaction_score', 'N/A')}")
            else:
                print(f"   ❌ Status: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_files_api(api_url, token):
    """Test the files/documents API endpoint"""
    print("\n" + "="*60)
    print("Testing Document Management API")
    print("="*60)

    endpoint = f"{api_url}/files"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    try:
        # List files
        print(f"\n📂 Listing knowledge base documents...")
        response = requests.get(endpoint, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            files = data.get('files', [])
            print(f"   ✅ Status: {response.status_code}")
            print(f"   📄 Total files: {len(files)}")

            # Show first 3 files
            for i, file in enumerate(files[:3], 1):
                print(f"\n   File {i}:")
                print(f"   - Name: {file.get('key', 'N/A')}")
                print(f"   - Size: {file.get('size', 0)} bytes")
                print(f"   - Modified: {file.get('last_modified', 'N/A')}")
        else:
            print(f"   ❌ Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_user_profile_api(api_url, token):
    """Test the user profile API endpoint"""
    print("\n" + "="*60)
    print("Testing User Profile API")
    print("="*60)

    endpoint = f"{api_url}/user-profile"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    try:
        # Get user profile
        print(f"\n👤 Fetching user profile...")
        response = requests.get(endpoint, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {response.status_code}")
            print(f"   Profile data: {json.dumps(data, indent=2)[:300]}...")
        elif response.status_code == 404:
            print(f"   ⚠️  No profile found (this is normal for new users)")
        else:
            print(f"   ❌ Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_recommendations_api(api_url, token):
    """Test the recommendations API endpoint"""
    print("\n" + "="*60)
    print("Testing Recommendations API")
    print("="*60)

    endpoint = f"{api_url}/recommendations"
    headers = {'Authorization': f'Bearer {token}'}

    try:
        print(f"\n💡 Fetching personalized recommendations...")
        response = requests.get(endpoint, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {response.status_code}")
            print(f"   Recommendations: {json.dumps(data, indent=2)[:300]}...")
        else:
            print(f"   ❌ Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def main():
    print("="*60)
    print("Learning Navigator - Admin Portal API Test Suite")
    print("="*60)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Step 1: Get API URL
    api_url = get_api_gateway_url()
    if not api_url:
        print("❌ Could not find API Gateway URL")
        return
    print(f"✅ API Gateway URL: {api_url}")

    # Step 2: Authenticate
    token = authenticate()
    if not token:
        return

    # Step 3: Test all APIs
    test_session_logs_api(api_url, token)
    test_files_api(api_url, token)
    test_user_profile_api(api_url, token)
    test_recommendations_api(api_url, token)

    print("\n" + "="*60)
    print("✅ Test suite completed!")
    print("="*60)

if __name__ == "__main__":
    main()
