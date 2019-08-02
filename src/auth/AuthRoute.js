import React from "react";
import App from "../App";
import AuthWrapper from "./AuthWrapper";

const AuthRoute = () => {
  return (
    <>
      <AuthWrapper path="/" component={App} />
    </>
  );
};

export default AuthRoute;
