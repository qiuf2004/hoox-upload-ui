import { useState, useRef, useReducer } from 'react';
import { useFileUpload } from '@/lib/file-upload';

const useUploadModal = () => {
  const [visible, setVisible] = useState(false);
  const currPause = useRef([]); // 当前暂停的fileUnid
  const currDel = useRef([]); // 当前取消上传的fileUnid

  const reducer = (state, action) => {
    switch (action.type) {
      case 'init':
        return action.files;
      case 'add':
        return [action.file, ...state];
      case 'update':
        return state?.filter(Boolean)?.map((item) => {
          if (action.uid === item.fileUnid) return action.file ?? { ...item, status: 'exception' };
          else return item;
        });
      case 'pause':
        return state?.filter(Boolean)?.map((item) => {
          if (action.uid === item.fileUnid) return action.file ?? { ...item, status: 'pause' };
          else return item;
        });
      case 'continue':
        return state?.filter(Boolean)?.map((item) => {
          if (action.uid === item.fileUnid) return action.file ?? { ...item, status: 'active' };
          else return item;
        });
      case 'delete':
        return state?.filter(Boolean)?.filter((item) => item.fileUnid !== action.uid);
      case 'clear':
        return [];
      default:
        throw new Error();
    }
  };

  const [state, dispatch] = useReducer(reducer, []);

  const { customRequest } = useFileUpload({});

  const pickUploadList = () => {
    setVisible(true);
  };

  const delUpload = (item) => {
    const { fileUnid } = item;
    dispatch({ type: 'delete', uid: fileUnid });
    const delFile = state?.find((item) => fileUnid === item.fileUnid);
    if (delFile?.status === 'active') {
      currDel.current?.push(fileUnid);
    }
  };

  const pauseUpload = (fileUnid) => {
    dispatch({ type: 'pause', uid: fileUnid });
    currPause.current?.push(fileUnid);
  };

  const continueUpload = (fileUnid) => {
    dispatch({ type: 'continue', uid: fileUnid });
    const file = state.find((item) => item.fileUnid === fileUnid);
    currPause.current = currPause.current.filter((item) => item !== fileUnid);

    customRequest({
      option: file.option,
      unid: file.serviceId,
      currPause: currPause.current,
      currDel: currDel.current,
    });
    return currPause.current;
  };

  const onCancel = () => {
    setVisible(false);
    currDel.current = [];
  };

  const props = {
    visible,
    state,
    dispatch,
    currPause: currPause.current,
    currDel: currDel.current,
    delUpload,
    pauseUpload,
    continueUpload,
    onCancel,
  };

  return {
    pickUploadList,
    ...props,
  };
};

export default useUploadModal;

export type IProps = Partial<Omit<ReturnType<typeof useUploadModal>, 'pickUploadList'>>;
