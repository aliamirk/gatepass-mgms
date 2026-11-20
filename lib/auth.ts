export interface User {
    username: string;
    password: string;
    redirect: string;
  }
  

export const users = [
    { username: "hrdept", password: "hr@32#", redirect: "/hr" },
  ];
  
  export const authenticate = (username: string, password: string) => {
    return users.find(
      (u) => u.username === username.toLowerCase() && u.password === password
    );
  };
  