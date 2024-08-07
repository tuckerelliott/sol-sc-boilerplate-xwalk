/* eslint-disable no-underscore-dangle */
export default async function decorate(block) {
  const variationname = 'main';
  const url = block.querySelector(':scope div:nth-child(1) > div').innerHTML.trim();
  console.log(url);
  console.log(error.cause);

  const cfReq = await fetch(url)
    .then((response) => response.json())
    .then((contentfragment) => {
      let offer = '';
      if (contentfragment.data) {
        offer = contentfragment.data.adventureByPath.item;
      }
      return offer;
    });

  // const itemId = `urn:aemconnection:${offerpath}/jcr:content/data/master`;
  const itemId = `${url}/jcr:content/data/master`;

  block.innerHTML = `
  <div class='banner-content' data-aue-resource=${itemId} data-aue-type="reference" data-aue-filter="cf">
      <div data-aue-prop="heroImage" data-aue-type="media" class='banner-detail' style="background-image: linear-gradient(90deg,rgba(0,0,0,0.6), rgba(0,0,0,0.1) 80%) ,url(${cfReq.primaryImage._publishUrl});">
          <p data-aue-prop="headline" data-aue-type="text" class='pretitle'>${cfReq.title}</p>
          <p data-aue-prop="detail" data-aue-type="richtext" class='detail'>${cfReq.description.plaintext}</p>
      </div>
      <div class='banner-logo'>
      </div>
  </div>
`;
}
