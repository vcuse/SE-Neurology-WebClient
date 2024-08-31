import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  background-color: rgba(0, 0, 0, 0);
  color: #ffffff;
  text-align: center;
  font-size: 1rem;
  position: absolute;
  bottom: 0;
  width: 100%;
`;

const Footer: React.FC = () => {
  return (
    <FooterContainer>
      © 2024 Virginia Commonwelath University
    </FooterContainer>
  );
};

export default Footer;
