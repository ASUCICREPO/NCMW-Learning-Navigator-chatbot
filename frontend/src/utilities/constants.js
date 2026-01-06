// API Endpoints Configuration
// These values are obtained from environment variables set by AWS Amplify

// WebSocket API endpoint for real-time chat communication
export const WEBSOCKET_API = process.env.REACT_APP_WEBSOCKET_API || 'wss://t8lev2pyz0.execute-api.us-west-2.amazonaws.com/production';

// REST API endpoint for admin operations (file management, analytics)
export const DOCUMENTS_API = process.env.REACT_APP_ANALYTICS_API || 'https://tuvw7wkl4l.execute-api.us-west-2.amazonaws.com/prod/';

// Feedback API endpoint
export const FEEDBACK_API = `${DOCUMENTS_API}feedback`.replace('//', '/').replace(':/', '://');

// Cognito configuration for authentication
export const COGNITO_CONFIG = {
  userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || 'us-west-2_F4rwE0BpC',
  userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || '42vl26qpi5kkch11ejg1747mj8',
  region: process.env.REACT_APP_AWS_REGION || 'us-west-2'
};

// Feature flags
export const ALLOW_FILE_UPLOAD = true;
export const ALLOW_MARKDOWN_BOT = true;

// Feature flags
export const ALLOW_MULTLINGUAL_TOGGLE = true;
export const ALLOW_LANDING_PAGE = true;

// UI Color constants - National Council Brand
export const HEADER_TEXT_GRADIENT = 'linear-gradient(135deg, #064F80 0%, #7FD3EE 100%)'; // Dark Blue to Light Blue
export const BOTMESSAGE_BACKGROUND = '#F4EFE8'; // Neutral 50%
export const ABOUT_US_HEADER_BACKGROUND = '#EAF2F4'; // Neutral Blue 25%
export const FAQ_HEADER_BACKGROUND = '#FAD7C9'; // Primary Orange 25%

// Landing page text for multilingual support
export const LANDING_PAGE_TEXT = {
  EN: {
    CHOOSE_LANGUAGE: 'Choose Your Language',
    ENGLISH: 'English',
    SPANISH: 'Spanish',
    SAVE_CONTINUE: 'Save and Continue'
  },
  ES: {
    CHOOSE_LANGUAGE: 'Elige tu idioma',
    ENGLISH: 'Inglés',
    SPANISH: 'Español',
    SAVE_CONTINUE: 'Guardar y continuar'
  }
};

// UI Text constants
export const TEXT = {
  EN: {
    CHAT_TITLE: 'Learning Navigator',
    PLACEHOLDER: 'Ask about training, courses, or resources...',
    SEND_BUTTON: 'Send',
    ABOUT_US_TITLE: 'About Learning Navigator',
    ABOUT_US_TEXT: 'Your AI-powered assistant for the MHFA Learning Ecosystem - helping instructors, learners, and administrators navigate training resources and reduce administrative burden.',
    FAQ_TITLE: 'Frequently Asked Questions'
  },
  ES: {
    CHAT_TITLE: 'Navegador de Aprendizaje',
    PLACEHOLDER: 'Pregunte sobre capacitación, cursos o recursos...',
    SEND_BUTTON: 'Enviar',
    ABOUT_US_TITLE: 'Acerca del Navegador de Aprendizaje',
    ABOUT_US_TEXT: 'Su asistente impulsado por IA para el Ecosistema de Aprendizaje MHFA: ayudando a instructores, estudiantes y administradores a navegar recursos de capacitación.',
    FAQ_TITLE: 'Preguntas Frecuentes'
  }
};

export const ABOUT_US_TEXT = TEXT;
export const FAQ_TEXT = {
  EN: [
    { question: 'What can Learning Navigator help me with?', answer: 'I can assist with MHFA training resources, course navigation, instructor policies, learner materials, and administrative procedures.' },
    { question: 'How do I access MHFA Connect?', answer: 'Visit the MHFA Connect platform with your credentials to access training materials, resources, and track your certification progress.' },
    { question: 'Who can use Learning Navigator?', answer: 'Learning Navigator supports instructors, learners, and administrators in the MHFA Learning Ecosystem.' }
  ],
  ES: [
    { question: '¿Con qué puede ayudarme el Navegador de Aprendizaje?', answer: 'Puedo ayudar con recursos de capacitación MHFA, navegación de cursos, políticas de instructores, materiales para estudiantes y procedimientos administrativos.' },
    { question: '¿Cómo accedo a MHFA Connect?', answer: 'Visite la plataforma MHFA Connect con sus credenciales para acceder a materiales de capacitación, recursos y seguir su progreso de certificación.' },
    { question: '¿Quién puede usar el Navegador de Aprendizaje?', answer: 'El Navegador de Aprendizaje apoya a instructores, estudiantes y administradores en el Ecosistema de Aprendizaje MHFA.' }
  ]
};

export const SWITCH_TEXT = {
  EN: {
    LANGUAGE_SWITCH: 'Switch to Spanish',
    CHAT: 'Chat',
    ADMIN: 'Admin'
  },
  ES: {
    LANGUAGE_SWITCH: 'Cambiar a inglés',
    CHAT: 'Chat',
    ADMIN: 'Administrador'
  }
};
