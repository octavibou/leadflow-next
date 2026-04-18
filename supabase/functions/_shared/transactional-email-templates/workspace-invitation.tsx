import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "QuizzFlow"

interface WorkspaceInvitationProps {
  workspaceName?: string
  role?: string
  inviterEmail?: string
  acceptUrl?: string
}

const WorkspaceInvitationEmail = ({
  workspaceName = 'un workspace',
  role = 'editor',
  inviterEmail,
  acceptUrl,
}: WorkspaceInvitationProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Te han invitado a {workspaceName} en {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          ¡Te han invitado a colaborar!
        </Heading>
        <Text style={text}>
          {inviterEmail ? `${inviterEmail} te` : 'Te'} ha invitado a unirte al workspace{' '}
          <strong>{workspaceName}</strong> en {SITE_NAME} con el rol de <strong>{role}</strong>.
        </Text>
        {acceptUrl && (
          <Button style={button} href={acceptUrl}>
            Aceptar invitación
          </Button>
        )}
        {!acceptUrl && (
          <Text style={text}>
            Inicia sesión en {SITE_NAME} para aceptar la invitación.
          </Text>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          Si no esperabas esta invitación, puedes ignorar este email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WorkspaceInvitationEmail,
  subject: (data: Record<string, any>) =>
    `Te han invitado a ${data.workspaceName || 'un workspace'} en ${SITE_NAME}`,
  displayName: 'Invitación a workspace',
  previewData: {
    workspaceName: 'Mi Agencia',
    role: 'Editor',
    inviterEmail: 'admin@empresa.com',
    acceptUrl: 'https://embeddable-quiz.lovable.app/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0c0c0c', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '8px 0 24px',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '0' }
