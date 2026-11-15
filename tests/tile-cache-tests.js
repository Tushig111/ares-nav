// Runs against the real tile manager, without allocating a WebGL renderer.
export function runTileCacheTests(MarsQuadtreeGlobe){
  const results=[];
  const test=(name,fn)=>{try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}};
  const assert=x=>{if(!x)throw new Error('Assertion failed');};
  const manager=()=>new MarsQuadtreeGlobe({parent:{add(){},remove(){},visible:true},camera:{},renderer:{capabilities:{getMaxAnisotropy:()=>1}}});
  test('LRU eviction disposes oldest unpinned texture',()=>{
    const q=manager(),disposed=[];
    for(const [key,used] of [['old',1],['new',3],['pinned',0]])q.cache.set(key,{used,texture:{dispose(){disposed.push(key);}}});
    q.pins.add('pinned');q.evict(2);assert(disposed.length===1&&disposed[0]==='old'&&q.cache.has('pinned'));
  });
  test('Pinned frontier is retained instead of forced eviction',()=>{
    const q=manager();q.cache.set('live',{used:1,texture:{dispose(){throw new Error('Live texture disposed');}}});q.pins.add('live');q.evict(0);assert(q.cache.size===1);
  });
  test('Refined descendants retain coverage after intermediate eviction',()=>{
    const q=manager(),parent={z:3,row:2,col:4,split:true,children:[]};
    for(let i=0;i<4;i++){
      const child={z:4,row:4+(i>>1),col:8+i%2};q.nodes.set(`${child.z}/${child.row}/${child.col}`,child);
      parent.children.push(child);q.cache.set(q.key('optical',child.z,child.row,child.col),{texture:{},used:1,uploaded:true});
    }
    assert(q.covered(parent));q.cache.delete(q.key('optical',4,4,8));assert(!q.covered(parent));
  });
  test('Unavailable thermal selection preserves current layer',()=>{
    const q=manager();assert(q.setLayer('thermal')===false&&q.layer==='optical');
  });
  return results;
}
