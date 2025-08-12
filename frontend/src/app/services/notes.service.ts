import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Note } from '../models/note.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private apiUrl = `${environment.apiUrl}/notes`;

  constructor(private http: HttpClient) {}

  getAllNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(this.apiUrl);
  }

  getNoteById(id: number): Observable<Note> {
    return this.http.get<Note>(`${this.apiUrl}/${id}`);
  }

  createNote(note: Note): Observable<Note> {
    return this.http.post<Note>(this.apiUrl, note);
  }

  updateNote(id: number, note: Note): Observable<Note> {
    return this.http.put<Note>(`${this.apiUrl}/${id}`, note);
  }

  deleteNote(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}