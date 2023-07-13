/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as fs from 'fs';
import COS from 'cos-nodejs-sdk-v5';
import * as crypto from 'crypto';
import * as path from 'path';
import dayjs = require('dayjs');

const COS_SDK = require('cos-nodejs-sdk-v5');

let cos: COS | null = null;

const getCos = () => {
  if (!cos) {
    const config = vscode.workspace.getConfiguration('tencent-cos-uploader');

    cos = new COS_SDK({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });

  }

  return cos as COS;
};

const getMD5 = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    var rs = fs.createReadStream(filePath);
    var hash = crypto.createHash('md5');
    rs.on('data', hash.update.bind(hash));
    rs.on('end', function () {
      resolve(hash.digest('hex'));
    });
    rs.on('error', function (err) {
      reject(err);
    });
  });
};



export const uploadToCos = async (filePath: string): Promise<COS.PutObjectResult> => {
  const { bucket, region, remotePath } = vscode.workspace.getConfiguration('tencent-cos-uploader');

  if (!bucket) {
    vscode.window.showErrorMessage('missing bucket param');
    return Promise.reject();
  }

  if (!region) {
    vscode.window.showErrorMessage('missing region param');
    return Promise.reject();
  }

  if (!remotePath) {
    vscode.window.showErrorMessage('missing remotePath param');
    return Promise.reject();
  }

  const img = await fs.readFileSync(filePath);

  const cos = getCos();

  const pathKey = (await getMD5(filePath)) + '_' + dayjs().valueOf() + path.extname(filePath);

  return new Promise((resolve, rejects) => {
    cos.putObject({
      Body: img,
      Bucket: bucket,
      Region: region,
      Key: path.join(remotePath, pathKey),
    }, (err: any, data: COS.PutObjectResult) => {
      if (err) {
        console.log(err);
        rejects(err);
        return;
      }

      resolve(data);
    });
  });
};