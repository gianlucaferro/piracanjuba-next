/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "npm:@react-email/components@0.0.22";

interface RecoveryEmailProps {
  confirmationUrl: string;
}

export default function RecoveryEmail({ confirmationUrl }: RecoveryEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>Redefinir sua senha</Text>
            <Text style={paragraph}>
              Recebemos uma solicitação para redefinir a senha da sua conta no Piracanjuba.Ai.
            </Text>
            <Text style={paragraph}>
              Clique no botão abaixo para criar uma nova senha:
            </Text>
            <Button style={button} href={confirmationUrl}>
              Redefinir Senha
            </Button>
            <Hr style={hr} />
            <Text style={disclaimer}>
              Se você não solicitou a redefinição, pode ignorar este email.
            </Text>
            <Text style={footer}>— Piracanjuba.Ai</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily: "Arial, sans-serif",
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const section: React.CSSProperties = {
  padding: "24px",
};

const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1a1a2e",
  marginBottom: "16px",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#333",
  marginBottom: "12px",
};

const button: React.CSSProperties = {
  backgroundColor: "#1a1a2e",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
  fontWeight: "bold",
  fontSize: "15px",
  marginTop: "8px",
  marginBottom: "8px",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e5e5",
  margin: "20px 0",
};

const disclaimer: React.CSSProperties = {
  fontSize: "13px",
  color: "#666",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#999",
  marginTop: "8px",
};
