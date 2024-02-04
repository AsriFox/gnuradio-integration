import {
    extensions, l10n, window, workspace,
    Uri, ConfigurationTarget,
} from "vscode";

const yamlExt = 'redhat.vscode-yaml';

export async function checkSchemaEnabled(extensionUri: Uri) {
    if (!extensions.getExtension(yamlExt)) {
        return undefined;
    }
    let schemas: { [key: string]: string } = workspace.getConfiguration().get('yaml.schemas') ?? {};

    const schemaPath = (filename: string) => Uri.joinPath(extensionUri, 'language', 'schemas', filename).toString();
    const requiredSchemas: [string, string][] = [
        [schemaPath('gnuradio-block.schema.json'), '*.block.yml'],
        [schemaPath('gnuradio-block-tree.schema.json'), '*.tree.yml'],
        [schemaPath('grc-flowgraph.schema.json'), '*.grc']
    ];
    if (requiredSchemas.every(v => schemas[v[0]] === v[1])) {
        return true;
    }

    const yes = l10n.t('Yes'), no = l10n.t('No'), dontshowagain = l10n.t("Don't show again");
    const useYamlSchema = await window.showInformationMessage(
        'Enable YAML schema for validation of GRC files?',
        yes, no, dontshowagain);
    if (useYamlSchema === dontshowagain) {
        return false;
    } else if (useYamlSchema === no) {
        return undefined;
    }

    const schemaFilter = requiredSchemas.map(v => v[1]);
    const newSchemasEntries = Object.entries(schemas)
        .filter(v => !schemaFilter.includes(v[1]))
        .concat(requiredSchemas);
    workspace.getConfiguration().update(
        'yaml.schemas',
        Object.fromEntries(newSchemasEntries),
        ConfigurationTarget.Global
    );
    return true;
}