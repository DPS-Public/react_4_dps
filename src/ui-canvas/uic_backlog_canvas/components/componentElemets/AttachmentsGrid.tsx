import { Image, Tag, message } from 'antd';
import React, { useMemo, useState } from 'react';

interface AttachmentsGridProps {
  files: any[];
  onAddFile?: () => void;
}

const AttachmentsGrid: React.FC<AttachmentsGridProps> = ({ files, onAddFile: _onAddFile }) => {

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewCurrent, setPreviewCurrent] = useState(0);

  const hasFiles = files && files.length > 0;
  const imageFiles = useMemo(
    () => (files || []).filter((file: any) => file?.type === 'image' && file?.url),
    [files]
  );

  const triggerDirectDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function downloadFile(url: string, fileName: string, index: number): Promise<boolean> {
    try {
      // First try native browser download for signed/storage URLs (most reliable for CORS-restricted links)
      triggerDirectDownload(url, fileName);
      return true;
    } catch (directDownloadError) {
      // Fallback to blob-based flow if native download fails
    }

    try {
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
        });
      } catch (directError) {
        const proxies = [
          'https://corsproxy.io/?',
          'https://api.codetabs.com/v1/proxy?quest=',
        ];
        
        const proxyUrl = proxies[0] + encodeURIComponent(url);
        response = await fetch(proxyUrl);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
      }, 100);

      return true;
    } catch (error) {
      console.error(`Error downloading file ${fileName}:`, error);
      return false;
    }
  }


  const getFileName = (file: any) => {
    if (file.name) return file.name;
    if (file.url) {
      const urlParts = file.url.split('/');
      return urlParts[urlParts.length - 1].split('?')[0];
    }
    return 'Unknown file';
  };

  const getShortFileName = (file: any, maxLength = 18) => {
    const fullName = getFileName(file);
    if (fullName.length <= maxLength) return fullName;

    const dotIndex = fullName.lastIndexOf('.');
    const hasExt = dotIndex > 0 && dotIndex < fullName.length - 1;
    const ext = hasExt ? fullName.slice(dotIndex) : '';
    const base = hasExt ? fullName.slice(0, dotIndex) : fullName;

    const keep = Math.max(8, maxLength - ext.length - 1);
    return `${base.slice(0, keep)}…${ext}`;
  };

  const openImagePreview = (file: any) => {
    const imageIndex = imageFiles.findIndex((img: any) => img?.url === file?.url);
    if (imageIndex >= 0) {
      setPreviewCurrent(imageIndex);
      setPreviewVisible(true);
    }
  };

  const handleFileDownload = async (file: any, index: number) => {
    if (!file?.url) {
      message.warning('File URL not found');
      return;
    }
    const ok = await downloadFile(file.url, getFileName(file), index);
    if (!ok) {
      message.error('Download failed');
    }
  };

  void _onAddFile;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">Attachments</span>
          {hasFiles && <Tag color="default" style={{ margin: 0 }}>{files.length}</Tag>}
        </div>
      </div>
      {hasFiles ? (
        <div className="flex flex-wrap items-start gap-2">
          {files.map((file, index) => (
            <div key={index} className="w-[110px] border rounded-md p-2 hover:shadow-sm transition-shadow cursor-pointer">
              <div className="relative group w-[60px] h-[60px] mx-auto overflow-hidden rounded border border-gray-100 bg-gray-50 flex items-center justify-center">
                {file.type === 'image' && file.url ? (
                  <Image
                    src={file.url}
                    alt={getFileName(file)}
                    width={60}
                    height={60}
                    className="object-cover"
                    preview={false}
                    onClick={() => openImagePreview(file)}
                  />
                ) : (
                  <button
                    type="button"
                    className="w-full h-full flex items-center justify-center"
                    onClick={() => void handleFileDownload(file, index)}
                  >
                    <span className="text-[10px] text-gray-500">File</span>
                  </button>
                )}
                <div className="pointer-events-none absolute inset-0 bg-black/45 text-white text-[11px] font-medium grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.type === 'image' && file.url ? 'Preview' : 'Download'}
                </div>
              </div>
              <div className="mt-1 text-[11px] font-medium truncate text-center" title={getFileName(file)}>
                {getShortFileName(file)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          No attachments yet.
        </div>
      )}  

      {imageFiles.length > 0 && (
        <div style={{ display: 'none' }}>
          <Image.PreviewGroup
            preview={{
              visible: previewVisible,
              current: previewCurrent,
              onVisibleChange: (visible) => setPreviewVisible(visible),
              onChange: (current) => setPreviewCurrent(current),
            }}
          >
            {imageFiles.map((file: any, index: number) => (
              <Image key={`${file?.url || 'img'}-${index}`} src={file.url} alt={getFileName(file)} />
            ))}
          </Image.PreviewGroup>
        </div>
      )}
    </div>
  );
};

export default AttachmentsGrid;

