import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export class ModDecompiler {
  constructor(processId, baseWorkDir) {
    this.processId = processId;
    this.baseDir = path.join(baseWorkDir, processId);
    this.extractedDir = path.join(this.baseDir, 'extracted');
  }

  findClassFiles(dir) {
    const classFiles = [];

    const walk = (currentPath) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.class')) {
          classFiles.push(fullPath);
        }
      }
    };

    walk(dir);
    return classFiles;
  }

  async decompileClasses(classFiles, currentPath) {
    const cfrPath = path.resolve(currentPath, '..', '..', '..', 'tools', 'cfr-0.152.jar');

    if (!fs.existsSync(cfrPath)) {
      throw new Error(`Decompilador não encontrado em: ${cfrPath}`);
    }

    for (const classFile of classFiles) {
      await new Promise((resolve, reject) => {
        const command = `java -jar "${cfrPath}" "${classFile}" --outputdir "${currentPath}"`;

        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`Erro ao descompilar ${classFile}:`, stderr);
            reject(new Error(`Erro ao descompilar ${classFile}: ${stderr}`));
          } else {
            resolve();
          }
        });
      });
    }

    return true;
  }

  removeClassFiles(classFiles) {
    let removedCount = 0;

    classFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        //console.log(`Removido: ${filePath}`);
        removedCount++;
      }
    });

    return removedCount;
  }
}