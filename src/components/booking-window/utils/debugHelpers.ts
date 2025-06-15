
export const debugBookingWindowRule = (context: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[BookingWindow:${context}]`, data);
  }
};

export const debugUserScopeChange = (
  context: string, 
  oldScope: string, 
  newScope: string, 
  tags: string[], 
  isManual: boolean
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[UserScope:${context}]`, {
      oldScope,
      newScope,
      tags,
      isManual,
      timestamp: new Date().toISOString()
    });
  }
};
