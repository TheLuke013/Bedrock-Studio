export class ModInfo {
    constructor() {
        this.loader = Loader.NONE;
        this.id = null;
        this.name = null;
        this.description = null;
        this.version = null;
        this.mcversion = null;
        this.authors = [];
        this.license = null;
        this.url = null;
    }

    getInfoString() {
        return `\n\n    *** MOD INFO *** \n
    Name: ${this.name}
    ID(namespace): ${this.id}
    Description: ${this.description}
    ModLoader: ${this.loader}
    Version: ${this.version}
    Authors: ${this.authors.join(', ')}
    License: ${this.license}
    URL: ${this.url}
    `.trim();
    }
}

export const Loader = {
    OLD_FORGE: 'Forge(Old)',
    NEW_FORGE: 'Forge(New)',
    FABRIC: 'Fabric',
    OTHER: 'Other(Not Supported)',
    NONE: 'Unknow'
};
