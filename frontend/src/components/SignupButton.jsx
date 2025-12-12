import React from 'react';

const SignupButton = () => {
  const handleSignup = () => {
    window.location.href = '/register';
  };

  return (
    <button id="signup-button" onClick={handleSignup}>
      Sign Up
    </button>
  );
};

export default SignupButton;
