import { CognitoUserPool } from 'amazon-cognito-identity-js';
import { COGNITO_CONFIG } from './constants';

// Configure AWS region for Cognito
if (typeof window !== 'undefined') {
  window.AWS = window.AWS || {};
  window.AWS.config = window.AWS.config || {};
  window.AWS.config.region = COGNITO_CONFIG.region;
}

const poolData = {
  UserPoolId: COGNITO_CONFIG.userPoolId,
  ClientId: COGNITO_CONFIG.userPoolWebClientId,
  endpoint: `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`
};

const UserPool = new CognitoUserPool(poolData);

export default UserPool;
