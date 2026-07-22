import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SemesterMetadata } from 'src/app/model/semester-metadata.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-semester-metadata-form',
  templateUrl: './semester-metadata-form.component.html',
  styleUrls: ['./semester-metadata-form.component.scss']
})
export class SemesterMetadataFormComponent {
  semesterName: string = '';
  codeSemester: string = '';
  year: number | null = null;
  isCurrentSemester: boolean = false;
  // Lưu KEY, không lưu chuỗi đã dịch (§4.1 kế hoạch i18n).
  messageKey: string = '';
  id: number = 0;

  constructor(
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<SemesterMetadataFormComponent>
  ) {}

  ngOnInit() {
    this.id = this.data.id;
    if (this.id > 0) {
      this.loadSemester();
    }
  }

  loadSemester() {
    this.http.get(`${environment.apiBaseUrl}/GetSemesterMetadataById/${this.id}`)
      .subscribe({
        next: (res) => {
          const record = Object.assign(new SemesterMetadata(), res);
          this.semesterName = record?.semesterName != null ? record.semesterName : '';
          this.codeSemester = record?.codeSemester != null ? record.codeSemester : '';
          this.year = record?.year ?? null;
          this.isCurrentSemester = record?.isCurrentSemester === true;
        },
        error: (err) => {
          console.error(err);
          this.messageKey = 'semester.loadFailed';
        }
      });
  }

  submitForm() {
    if (!this.semesterName) {
      this.messageKey = 'semester.missingName';
      return;
    }

    if (!this.codeSemester) {
      this.messageKey = 'semester.missingCode';
      return;
    }

    if (this.year == null || Number.isNaN(this.year)) {
      this.messageKey = 'semester.missingYear';
      return;
    }

    if (this.isCurrentSemester && this.hasAnotherCurrentSemester()) {
      this.messageKey = 'semester.onlyOneCurrent';
      return;
    }

    const payload: SemesterMetadata = {
      semesterName: this.semesterName,
      codeSemester: this.codeSemester,
      year: this.year,
      isCurrentSemester: this.isCurrentSemester
    };

    if (this.id > 0) {
      this.http.put(`${environment.apiBaseUrl}/UpdateSemesterMetadataById/${this.id}`, payload)
        .subscribe({
          next: () => {
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
            this.messageKey = 'semester.updateFailed';
          }
        });
    } else {
      this.http.post(`${environment.apiBaseUrl}/SemesterMetadata`, payload)
        .subscribe({
          next: () => {
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
            this.messageKey = 'semester.createFailed';
          }
        });
    }
  }

  hasAnotherCurrentSemester(): boolean {
    const semesters: SemesterMetadata[] = this.data?.semesters || [];
    return semesters.some(item => item.isCurrentSemester && item.id !== this.id);
  }

  cancel() {
    this.dialogRef.close();
  }
}
