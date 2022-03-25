export default {
  async readURLFile(path: string) {
    let text = '';
    const respionse = await fetch(new Request(path));
    if (!respionse.ok) throw new Error(respionse.statusText);
    text = await respionse.text();
    return text;
  },
  async eagelFile(
    filename: string,
  ): Promise<{ data: string; filename: string }> {
    const tschPath = '../data/typedSchematics/';
    const data = await this.readURLFile(tschPath + filename);
    return { data: data, filename: filename };
  },
};
