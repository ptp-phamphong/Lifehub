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
  message: string = '';
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
          this.message = 'Gửi thất bại.';
        }
      });
  }

  submitForm() {
    if (!this.semesterName) {
      this.message = 'Vui lòng nhập tên học kỳ.';
      return;
    }

    if (!this.codeSemester) {
      this.message = 'Vui lòng nhập mã học kỳ.';
      return;
    }

    if (this.year == null || Number.isNaN(this.year)) {
      this.message = 'Vui lòng nhập năm học kỳ.';
      return;
    }

    if (this.isCurrentSemester && this.hasAnotherCurrentSemester()) {
      this.message = 'Chỉ được tồn tại một học kỳ hiện tại.';
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
            this.message = 'Cập nhật thất bại.';
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
            this.message = 'Tạo mới thất bại.';
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
