import { announcementsRepository, AnnouncementsRepository } from './announcements.repository';

export class AnnouncementsService {
  constructor(private repo: AnnouncementsRepository = announcementsRepository) {}

  async listAnnouncements() {
    return this.repo.findAll();
  }

  async createAnnouncement(data: { title: string; content: string; authorId: string }) {
    return this.repo.create(data);
  }

  async deleteAnnouncement(id: string) {
    return this.repo.delete(id);
  }
}

export const announcementsService = new AnnouncementsService();
