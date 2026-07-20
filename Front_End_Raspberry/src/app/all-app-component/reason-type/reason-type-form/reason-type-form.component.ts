import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReasonType } from 'src/app/model/reason-type.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-reason-type-form',
  templateUrl: './reason-type-form.component.html',
  styleUrls: ['./reason-type-form.component.scss']
})
export class ReasonTypeFormComponent {
  reasonName: string = '';
  sortOrder?: number = 0;
  active: boolean = true;
  defaultFilterType: number = 1;
  message: string = '';
  // Xem ghi chú ở expense-record.component.ts: emoji cũ là tín hiệu duy nhất
  // phân biệt thành công/lỗi, nên bỏ emoji thì phải có trường trạng thái này.
  messageType: 'success' | 'error' | 'warning' = 'success';
  id: number = 0;

  constructor(private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ReasonTypeFormComponent>
  ) { }


  ngOnInit() {
    this.id = this.data.id;
    if (this.id > 0) {
      this.loadReasonType();
    }
  }

  loadReasonType() {
    this.http.get(`${environment.apiBaseUrl}/GetReasonTypeById/${this.id}`)
      .subscribe({
        next: (res) => {
          const record = Object.assign(new ReasonType(), res);
          this.reasonName = record?.reasonName != null ? record.reasonName : '';
          this.sortOrder = record?.sortOrder != null ? record.sortOrder : null;
          this.active = record?.active;
          this.defaultFilterType = record?.defaultFilterType != null ? record.defaultFilterType : 1;
          console.log(res);
        },
        error: (err) => {
          console.error(err);
          this.messageType = 'error';
          this.message = 'Gửi thất bại!';
        }
      });
  }


  submitForm() {
    if (!this.reasonName) {
      this.messageType = 'warning';
      this.message = 'Vui lòng nhập đầy đủ thông tin.';
      return;
    }

    if (!this.defaultFilterType) {
      this.messageType = 'warning';
      this.message = 'Vui lòng chọn loại lọc mặc định.';
      return;
    }

    const payload : ReasonType = {
      reasonName: this.reasonName,
      sortOrder: this.sortOrder,
      active: this.active,
      defaultFilterType: this.defaultFilterType
    };
    if (this.id > 0) {


      this.http.put(`${environment.apiBaseUrl}/UpdateReasonTypeById/${this.id}`, payload)
        .subscribe({
          next: (res) => {
            this.messageType = 'success';
            this.message = 'Gửi thành công!';
            this.reasonName = '';
            this.active = null;
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
          }
        });
    }
    else {

      this.http.post(`${environment.apiBaseUrl}/ReasonType`, payload)
        .subscribe({
          next: (res) => {
            this.messageType = 'success';
            this.message = 'Gửi thành công!';
            this.reasonName = '';
            this.sortOrder = null;
            this.active = null;
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
          }
        });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
