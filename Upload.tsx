import React, { useState } from 'react';
import { message, Upload } from 'antd';
import { UploadProps } from 'antd/es/upload';
import { Helper } from '@/lib/idaas';

export interface IConfig {
  action?: string;
  getDownLoadUrl?: ({ fileId, fileName }: { fileId: string; fileName: string }) => string;
}

let uploadConfig: IConfig = {
  action: '/fileapi/uop/file/v1/upload-electronic-materials',
  getDownLoadUrl: ({ fileId, fileName }) =>
    `/fileapi/uop/file/v1/download-electronic-materials?fileId=${fileId}&fileName=${fileName}`,
};

export const config = (customConfig: IConfig = {}) => {
  uploadConfig = { ...uploadConfig, ...customConfig };
};

const getNormalizeAccept = (accept) => {
  if (!accept) return undefined;
  return [...accept, ...accept.map((i) => i.toUpperCase())].join(',');
};

type internalProps = 'openFileDialogOnClick' | 'action' | 'accept' | 'name';

export interface INormalizeFileValue {
  status: string;
  response: {
    data: [
      {
        id: string;
        file_name: string;
        file_path: string;
      }
    ];
  };
  uid: string;
  name: string;
  url: string;
  fileUrl: string;
}

export interface IProps extends Omit<UploadProps, internalProps> {
  perFileMaxSize?: number;
  maxCount?: number;
  accept?: string[];
  /** 发到后台的文件参数名，默认值是 file */
  dataName: string;
  normalizeFileList?: (fileList: INormalizeFileValue[]) => INormalizeFileValue[];
}

const calcMultipleProp = (multiple: boolean, maxCount: number) => {
  if (multiple === undefined) return false;

  if (multiple === false) return false;

  if (maxCount !== undefined) return false;

  // 只有再未设置 maxCount 的情况下才可以设置能否多选上传，因为多选的时候去限制上传数量体验不是很好
  return true;
};

const InternalUpload = React.forwardRef<any, IProps>((props, ref) => {
  const {
    // NOTE: 不在这里设置默认值，因为 calcMultipleProp 需要判断是否设置了 maxCount
    maxCount,
    perFileMaxSize = Infinity,
    accept,
    beforeUpload: customBeforeUpload,
    defaultFileList = [],
    fileList,
    onChange,
    multiple,
    dataName = 'file',
    normalizeFileList: customNormalizeFileList,
    ...antdUploadProps
  } = props;

  const [internalFileList, setInternalFileList] = useState(defaultFileList);

  const isControlled = fileList !== undefined;
  const uploadValue = isControlled ? fileList : internalFileList;

  const canMultiple = calcMultipleProp(multiple, maxCount);

  const normalizeAccept = getNormalizeAccept(accept);

  const verifyFile = ({ name, size }) => {
    const [filename, ext] = name.split('.');
    const isLimtSize = size / 1024 / 1024 < perFileMaxSize;

    if (!filename) {
      return {
        isValid: false,
        errorMessage: `文件名不合法`,
      };
    }

    if (accept && !normalizeAccept.split(',').some((item) => item.includes(ext))) {
      return {
        isValid: false,
        errorMessage: `上传文件类型仅支持${accept.join('、')}`,
      };
    }

    if (!isLimtSize) {
      return {
        isValid: false,
        errorMessage: `上传文件不得超过${perFileMaxSize}MB`,
      };
    }

    return {
      isValid: true,
    };
  };

  const beforeUpload = (file, fileList) => {
    if (!uploadConfig.action) {
      console.warn('请通过 config 方法指定 action');
      return false;
    }

    const { isValid, errorMessage } = verifyFile(file);

    if (!isValid) {
      message.info(errorMessage);
      return false;
    }

    if (typeof customBeforeUpload === 'function') {
      return customBeforeUpload(file, fileList);
    }

    return true;
  };

  const handleChange = ({ file, fileList }) => {
    // NOTE: 过滤掉被 beforeUpload 筛除的文件
    const validFileList = fileList.filter((i) => i.status);

    const errorHandler = () => {
      message.error('文件上传失败！');
      const normalizeFileList = validFileList.filter((i) => i.uid !== file.uid);

      if (!isControlled) {
        setInternalFileList(normalizeFileList);
      }

      onChange(normalizeFileList);
    };

    if (['uploading', 'removed'].includes(file.status)) {
      if (!isControlled) {
        setInternalFileList(validFileList);
      }
      onChange(validFileList);
    }

    if (file.status === 'error') {
      errorHandler();
    }

    if (file.status === 'done') {
      if (file.response.flag) {
        const responseData = file.response.data[0];
        const { id, file_name } = responseData;
        const url = uploadConfig.getDownLoadUrl({ fileId: id, fileName: file_name });

        let normalizeFileList = validFileList.map((item) => {
          if (item.uid === file.uid) {
            return {
              status: 'done',
              response: {
                data: [
                  {
                    id: id,
                    file_name: file_name,
                    file_path: url,
                  },
                ],
              },
              uid: id,
              name: file_name,
              url: url,
              fileUrl: url,
            };
          }
          return { ...item };
        });

        message.success('文件上传成功');

        if (!isControlled) {
          setInternalFileList(normalizeFileList);
        }

        if (customNormalizeFileList) {
          normalizeFileList = customNormalizeFileList(normalizeFileList);
        }

        onChange(normalizeFileList);
      } else {
        errorHandler();
      }
    }
  };

  const disabled = uploadValue.length >= (maxCount || Infinity);

  return (
    <Upload
      {...antdUploadProps}
      ref={ref}
      name={dataName}
      action={uploadConfig.action}
      accept={normalizeAccept}
      multiple={canMultiple}
      beforeUpload={beforeUpload}
      fileList={uploadValue}
      onChange={handleChange}
      openFileDialogOnClick={!disabled}
      headers={{ uam_token: Helper.getUserInfo()?.access_token }}
    >
      {React.isValidElement(props.children)
        ? props.children
        : typeof props.children === 'function'
        ? props.children({ disabled })
        : null}
    </Upload>
  );
});

export default InternalUpload;
