import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotesService } from './services/notes.service';
import { Note } from './models/note.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  notes: Note[] = [];
  selectedNote: Note | null = null;
  isEditing = false;
  isCreating = false;
  
  newNote: Partial<Note> = {
    title: '',
    content: ''
  };

  constructor(private notesService: NotesService) {}

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    this.notesService.getAllNotes().subscribe({
      next: (notes) => {
        this.notes = notes;
      },
      error: (error) => {
        console.error('Error cargando notas:', error);
      }
    });
  }

  selectNote(note: Note) {
    this.selectedNote = { ...note };
    this.isEditing = false;
    this.isCreating = false;
  }

  createNote() {
    this.isCreating = true;
    this.isEditing = false;
    this.selectedNote = null;
    this.newNote = { title: '', content: '' };
  }

  editNote() {
    if (this.selectedNote) {
      this.isEditing = true;
      this.isCreating = false;
    }
  }

  saveNote() {
    if (this.isCreating) {
      if (!this.newNote.title?.trim()) return;
      
      this.notesService.createNote(this.newNote as Note).subscribe({
        next: (note) => {
          this.notes.unshift(note);
          this.selectedNote = note;
          this.isCreating = false;
          this.newNote = { title: '', content: '' };
        },
        error: (error) => {
          console.error('Error creando nota:', error);
        }
      });
    } else if (this.isEditing && this.selectedNote) {
      if (!this.selectedNote.title?.trim()) return;
      
      this.notesService.updateNote(this.selectedNote.id!, this.selectedNote).subscribe({
        next: (updatedNote) => {
          const index = this.notes.findIndex(n => n.id === updatedNote.id);
          if (index !== -1) {
            this.notes[index] = updatedNote;
            // Mover la nota actualizada al principio
            this.notes = [updatedNote, ...this.notes.filter(n => n.id !== updatedNote.id)];
          }
          this.selectedNote = updatedNote;
          this.isEditing = false;
        },
        error: (error) => {
          console.error('Error actualizando nota:', error);
        }
      });
    }
  }

  deleteNote() {
    if (this.selectedNote && confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
      this.notesService.deleteNote(this.selectedNote.id!).subscribe({
        next: () => {
          this.notes = this.notes.filter(n => n.id !== this.selectedNote!.id);
          this.selectedNote = null;
          this.isEditing = false;
          this.isCreating = false;
        },
        error: (error) => {
          console.error('Error eliminando nota:', error);
        }
      });
    }
  }

  cancelEdit() {
    if (this.isCreating) {
      this.isCreating = false;
      this.newNote = { title: '', content: '' };
    } else if (this.isEditing) {
      this.isEditing = false;
      // Restaurar datos originales
      if (this.selectedNote) {
        const original = this.notes.find(n => n.id === this.selectedNote!.id);
        if (original) {
          this.selectedNote = { ...original };
        }
      }
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleString('es-ES');
  }
}