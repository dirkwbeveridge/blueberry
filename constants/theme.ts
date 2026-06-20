export const colors = {
  primary:      '#3D2B6B',
  accent:       '#C4B5E8',
  background:   '#FAF8F5',
  surface:      '#FFFFFF',
  text:         '#1A1A2E',
  textMuted:    '#675B78',
  success:      '#6DBF82',
  warning:      '#F4A261',
  error:        '#E76F51',
  border:       '#EDE8F5',
  primaryTint:  '#F5F0FF',
  successTint:  '#E8F8ED',
  warningTint:  '#FEF3E8',
  errorTint:    '#FEF0ED',
  shadow:       '#1A0F3A',
};

export const fonts = {
  heading: {
    bold:     'PlayfairDisplay_700Bold',
    semibold: 'PlayfairDisplay_600SemiBold',
  },
  body: {
    regular:  'DMSans_400Regular',
    medium:   'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
  },
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   48,
  xxl:  80,
};

export const radii = {
  sm:   8,
  md:   12,
  lg:   24,
  full: 9999,
};

export const typography = {
  display:    { fontSize: 56, lineHeight: 60, fontFamily: fonts.heading.bold      },
  title:      { fontSize: 26, lineHeight: 32, fontFamily: fonts.heading.bold      },
  heading:    { fontSize: 20, lineHeight: 28, fontFamily: fonts.heading.bold      },
  subheading: { fontSize: 17, lineHeight: 24, fontFamily: fonts.heading.semibold  },
  body:       { fontSize: 15, lineHeight: 24, fontFamily: fonts.body.regular      },
  label:      { fontSize: 13, lineHeight: 20, fontFamily: fonts.body.medium       },
  caption:    { fontSize: 11, lineHeight: 16, fontFamily: fonts.body.regular      },
};

export const cardStyle = {
  borderRadius:  radii.lg,
  backgroundColor: colors.surface,
  shadowColor:   '#3D2B6B',
  shadowOpacity: 0.06,
  shadowRadius:  12,
  shadowOffset:  { width: 0, height: 4 },
  elevation:     3,
  padding:       spacing.md,
};

export const priorityColors: Record<string, string> = {
  high:   colors.error,
  medium: colors.warning,
  low:    colors.success,
};
