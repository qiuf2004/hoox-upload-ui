import React from 'react';
import { Modal, Icon, Progress, Button, Empty } from 'antd';
import ModalFooter from '@/components/modal-footer';
import { useConfig } from '../config-provider/ConfigProvider';

import styles from './index.module.scss';

const { confirm } = Modal;

const Core = () => {
  const { state, dispatch, delUpload, pauseUpload, continueUpload, onCancel } = useConfig();
  const activeList = state?.filter((item) => item.status === 'active') || [];
  const pauseList = state?.filter((item) => item.status === 'pause') || [];
  const exceptList = state?.filter((item) => item.status === 'exception') || [];
  const doneList = state?.filter((item) => !item.status) || [];

  const sortList = [...exceptList, ...activeList, ...pauseList, ...doneList];

  const handleDel = (item) => {
    if (item.status) {
      confirm({
        title: '文件还未上传完成，确定放弃上传该文件？',
        onOk: async () => {
          delUpload(item);
        },
      });
    } else {
      delUpload(item);
    }
  };

  return (
    <>
      <div className={styles.content}>
        {!state?.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          sortList.map((item, index) => {
            const { fileUnid, fileName, fileSize, percent, status } = item;
            const uploading = status === 'active';

            return (
              <div className={styles.list} key={fileUnid}>
                <div className={styles.file}>
                  <div className={styles.name}>
                    {index + 1}
                    <span style={{ marginLeft: 8 }} title={fileName}>
                      {fileName}
                    </span>
                  </div>
                  <div className={styles.opt}>
                    {status && percent !== 0 && (
                      <div
                        title={uploading ? '暂停' : '继续'}
                        onClick={() => {
                          uploading ? pauseUpload(fileUnid) : continueUpload(fileUnid);
                        }}
                        className={uploading ? styles.pause : styles.continue}
                      />
                    )}
                    <Icon
                      title="删除"
                      type="delete"
                      onClick={() => handleDel(item)}
                      style={{ color: 'red', cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <div className={styles.size}>{(fileSize / 1024 / 1024).toFixed(2)}M</div>
                <div className={styles.percent}>
                  <Progress
                    percent={percent ?? 100}
                    strokeColor={status === 'pause' ? 'gold' : null}
                    size="small"
                    status={status === 'pause' ? 'normal' : status}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      <ModalFooter>
        <Button onClick={() => dispatch({ type: 'clear' })} style={{ marginRight: 8 }}>
          清空
        </Button>
        <Button onClick={onCancel}>关闭</Button>
      </ModalFooter>
    </>
  );
};

const UploadModal = () => {
  const { visible, state, pickUploadList, onCancel } = useConfig();
  const count = state?.filter((item) => item.status === 'active')?.length;

  return (
    <>
      {state?.length > 0 && (
        <div className={styles.upload_message} onClick={pickUploadList}>
          <div className={styles.image} />
          {count > 0 && <div className={styles.upload_num}>{count > 9 ? '9+' : count}</div>}
          <div>
            <span>{count > 0 ? '您有材料正在上传' : '您有材料上传成功'}</span>
            <Icon type="right" style={{ fontSize: 10 }} />
          </div>
        </div>
      )}
      <Modal
        destroyOnClose
        maskClosable={false}
        title="材料上传"
        footer={null}
        visible={visible}
        onCancel={onCancel}
        bodyStyle={{ marginTop: -16, paddingBottom: 56 }}
      >
        <Core />
      </Modal>
    </>
  );
};

export default UploadModal;
