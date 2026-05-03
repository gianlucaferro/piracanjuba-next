/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "npm:@react-email/components@0.0.22";

interface ReauthenticationEmailProps {
  token: string;
}

export default function ReauthenticationEmail({ token }: ReauthenticationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>Código de verificação</Text>
            <Text style={paragraph}>
              Seu código de verificação para o Piracanjuba.Ai é:
            </Text>
            <Text style={code}>{token}</Text>
            <Hr style={hr} />
            <Text style={disclaimer}>
              Se você não solicitou este código, pode ignorar este email.
            </Text>
            <Text style={footerStyle}>— Piracanjuba.Ai</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container: React.CSSProperties = { margin: "0 auto", padding: "20px 0 48px", maxWidth: "560px" };
const section: React.CSSProperties = { padding: "24px" };
const heading: React.CSSProperties = { fontSize: "24px", fontWeight: "bold", color: "#1a1a2e", marginBottom: "16px" };
const paragraph: React.CSSProperties = { fontSize: "15px", lineHeight: "1.6", color: "#333", marginBottom: "12px" };
const code: React.CSSProperties = { fontSize: "32px", fontWeight: "bold", color: "#1a1a2e", letterSpacing: "4px", textAlign: "center", padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "8px", marginBottom: "12px" };
const hr: React.CSSProperties = { borderColor: "#e5e5e5", margin: "20px 0" };
const disclaimer: React.CSSProperties = { fontSize: "13px", color: "#666" };
const footerStyle: React.CSSProperties = { fontSize: "12px", color: "#999", marginTop: "8px" };
