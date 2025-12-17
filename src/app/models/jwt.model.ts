export interface DecodedToken {

  sub?: string;           
  iss?: string;           
  aud?: string;          
  exp: number;            
  iat?: number;           
  nbf?: number;           

  
  userId?: string | number;
  userName?: string;
  name?: string;
  email?: string;
  role?: string;
  
  [key: string]: any;
} 