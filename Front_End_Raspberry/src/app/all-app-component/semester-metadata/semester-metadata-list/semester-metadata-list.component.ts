import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SemesterMetadata } from 'src/app/model/semester-metadata.model';
import { environment } from 'src/environments/environment';
import { SemesterMetadataFormComponent } from '../semester-metadata-form/semester-metadata-form.component';

@Component({
  selector: 'app-semester-metadata-list',
  templateUrl: './semester-metadata-list.component.html',
  styleUrls: ['./semester-metadata-list.component.scss']
})
export class SemesterMetadataListComponent {
  semesters: SemesterMetadata[] = [];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    this.loadSemesters();
  }

  loadSemesters() {
    this.http.get<SemesterMetadata[]>(`${environment.apiBaseUrl}/GetAllSemesterMetadata`).subscribe({
      next: (data) => {
        this.semesters = data;
      },
      error: (err) => console.error('Loi khi tai du lieu:', err)
    });
  }

  openEditDialog(id: number): void {
    const dialogRef = this.dialog.open(SemesterMetadataFormComponent, {
      width: '440px',
      data: {
        id,
        semesters: this.semesters
      },
      viewContainerRef: this.viewContainerRef
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'saved') {
        this.loadSemesters();
      }
    });
  }

  deleteRecord(item: SemesterMetadata) {
    const confirmed = window.confirm(`Ban co chac chan muon xoa hoc ky "${item.semesterName}" khong?`);
    if (!confirmed) {
      return;
    }

    this.http.delete(`${environment.apiBaseUrl}/DeleteSemesterMetadataById/${item.id}`)
      .subscribe({
        next: () => {
          this.loadSemesters();
        },
        error: (err) => {
          console.error(err);
        }
      });
  }
}
