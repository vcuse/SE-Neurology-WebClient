import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  background-color: rgba(0, 0, 0, .5);
  color: #ffffff;
  text-align: left;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
  width: 100%;
  position: absolute;
  top: 0;
  height: 8vh;
`;

const Header: React.FC = () => {
  return (
    <HeaderContainer>
      MCV Secure Teleconferencing Portal
    </HeaderContainer>
  );
};

export default Header;
