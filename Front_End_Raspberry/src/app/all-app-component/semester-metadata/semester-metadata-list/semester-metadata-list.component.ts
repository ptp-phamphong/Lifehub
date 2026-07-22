import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
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

  // `window.confirm` cần chuỗi ngay tại chỗ gọi nên đây là một trong số ít nơi
  // được dùng `instant()`. Không lưu kết quả vào field — dùng xong là xong.
  private readonly translate = inject(TranslateService);

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
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
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
    // Tên học kỳ chèn nguyên văn từ DB — không dịch, chỉ nhãn quanh nó mới dịch.
    const confirmed = window.confirm(
      this.translate.instant('semester.confirmDelete', { name: item.semesterName })
    );
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
