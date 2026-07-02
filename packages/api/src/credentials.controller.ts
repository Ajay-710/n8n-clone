import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as crypto from 'crypto';

@Controller('api/v1/credentials')
export class CredentialsController {
  constructor(private readonly prisma: PrismaService) {}

  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  static decrypt(text: string): string {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  @Get()
  async getCredentials() {
    try {
      const workspace = await this.prisma.workspace.findFirst();
      if (!workspace) return { status: 'success', data: [] };
      
      const creds = await this.prisma.credential.findMany({
        where: { workspaceId: workspace.id }
      });
      
      // We do not return the encryptedData to the frontend, just metadata
      return { 
        status: 'success', 
        data: creds.map(c => ({ id: c.id, name: c.name, type: c.type, createdAt: c.createdAt })) 
      };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }

  @Post()
  async createCredential(@Body() body: any) {
    try {
      let workspace = await this.prisma.workspace.findFirst();
      if (!workspace) throw new Error('No workspace found');

      const { name, type, data } = body;
      
      const credential = await this.prisma.credential.create({
        data: {
          workspaceId: workspace.id,
          name,
          type,
          encryptedData: this.encrypt(JSON.stringify(data))
        }
      });
      
      return { status: 'success', data: { id: credential.id, name: credential.name, type: credential.type } };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }

  @Delete(':id')
  async deleteCredential(@Param('id') id: string) {
    try {
      await this.prisma.credential.delete({ where: { id } });
      return { status: 'success' };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }
}
