import { createTheme } from '@mui/material/styles';

// National Council for Mental Wellbeing Brand Colors
// Source: Brand Guidelines 2025

export const nationalCouncilColors = {
  primary: {
    orange: '#EA5E29',      // Primary Orange
    orange75: '#EF865F',
    orange50: '#F5AE94',
    orange25: '#FAD7C9',
  },
  secondary: {
    gray: '#53605F',        // Primary Gray
    gray75: '#7E8887',
    gray50: '#A9AFAF',
    gray25: '#D4D7D7',
  },
  blue: {
    dark: '#064F80',        // Dark Blue
    dark75: '#447BA0',
    dark50: '#83A7C0',
    dark25: '#C1D3DF',
    light: '#7FD3EE',       // Light Blue
    light75: '#9FDEF2',
    light50: '#BFE9F7',
    light25: '#DFF4FB',
    neutral: '#ACCAD3',     // Neutral Blue
    neutral75: '#C1D7DE',
    neutral50: '#D5E4E9',
    neutral25: '#EAF2F4',
  },
  neutral: {
    main: '#E8E0D1',        // Neutral
    tint75: '#EEE8DD',
    tint50: '#F4EFE8',
    tint25: '#F9F7F4',
  },
  gradients: {
    orangeWarm: 'linear-gradient(135deg, #CB5223 0%, #EA5E29 100%)',
    orangeFade: 'linear-gradient(135deg, #EA5E29 0%, #FAD7C9 100%)',
    blueOcean: 'linear-gradient(135deg, #064F80 0%, #7FD3EE 100%)',
    blueCalm: 'linear-gradient(135deg, #ACCAD3 0%, #E8E0D1 100%)',
    petalWarm: 'linear-gradient(135deg, #EA5E29 0%, #E8E0D1 100%)',
  }
};

// Material-UI Theme Configuration with National Council Branding
const nationalCouncilTheme = createTheme({
  palette: {
    primary: {
      main: nationalCouncilColors.primary.orange,
      light: nationalCouncilColors.primary.orange50,
      dark: '#CB5223',
      contrastText: '#ffffff',
    },
    secondary: {
      main: nationalCouncilColors.blue.dark,
      light: nationalCouncilColors.blue.light,
      dark: '#043A5F',
      contrastText: '#ffffff',
    },
    background: {
      default: nationalCouncilColors.neutral.tint25,
      paper: '#ffffff',
      userMessage: nationalCouncilColors.blue.neutral25,
      botMessage: nationalCouncilColors.neutral.tint50,
      header: nationalCouncilColors.blue.dark,
    },
    text: {
      primary: nationalCouncilColors.secondary.gray,
      secondary: nationalCouncilColors.secondary.gray75,
    },
    divider: nationalCouncilColors.secondary.gray25,
    success: {
      main: '#2E7D32',
    },
    error: {
      main: '#D32F2F',
    },
  },
  typography: {
    fontFamily: [
      'Calibri',           // Fallback font when Ideal Sans not available
      'Ideal Sans',        // Brand font
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 600,
      color: nationalCouncilColors.secondary.gray,
    },
    h2: {
      fontWeight: 600,
      color: nationalCouncilColors.secondary.gray,
    },
    h3: {
      fontWeight: 600,
      color: nationalCouncilColors.secondary.gray,
    },
    h4: {
      fontWeight: 600,
      color: nationalCouncilColors.secondary.gray,
    },
    h5: {
      fontWeight: 500,
      color: nationalCouncilColors.secondary.gray,
    },
    h6: {
      fontWeight: 500,
      color: nationalCouncilColors.secondary.gray,
    },
    body1: {
      color: nationalCouncilColors.secondary.gray,
    },
    body2: {
      color: nationalCouncilColors.secondary.gray75,
    },
  },
  shape: {
    borderRadius: 20,  // Petal-inspired rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(234, 94, 41, 0.3)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        outlined: {
          borderColor: nationalCouncilColors.primary.orange50,
          color: nationalCouncilColors.primary.orange,
          '&:hover': {
            backgroundColor: nationalCouncilColors.primary.orange25,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 20,
        },
      },
    },
  },
});

export default nationalCouncilTheme;
