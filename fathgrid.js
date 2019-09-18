var style = document.createElement('style');
style.setAttribute("id","FathGrid_styles");
style.innerHTML = `
  .fathgrid th.sorted, th.sorted-desc {position: relative;}
  .fathgrid th.sorted::after {content:"▲";position:absolute;right: 1em;}
  .fathgrid th.sorted-desc::after {content:"▼";position:absolute;right: 1em;}
  .fathgrid-export-nav {float:right;}
  .fathgrid-wrapper {position:relative;}
  .fathgrid-wrapper .page-info {position:absolute;top:0}
`;
document.head.appendChild(style);
((function(win){
  win.FathTable=function(id,_config){
    var config={
        id:id, 
        size:20, 
        page:1, 
        tableClasses:"table table-hover table-bordered",
        tableHeadClasses:"thead-light",
        filter:true,
        columns:{},
        onRender:function(){},
        onClick:function(row,col,el){editCell(row,col,el)},
        onEdit:function(row,col,old,value){},
        data:null,
        editinput:undefined,
        ..._config
    };
    var data=config.data===null?[]:config.data;
    var fdata=data;//filtered data
    var table=document.getElementById(id);
    var thead=table.querySelector(":scope thead");
    var tbody=table.querySelector(":scope tbody");

    var renderPaginator=function(){
      return `
        <ul class="pagination" >
          <li class="page-item"><a class="page-link firstpage" title="First" href="#">&#x2503;&#x23F4;</a></li>
          <li class="page-item"><a class="page-link prevpage" title="Previous" href="#">&#x23F4;</a></li>
          <li class="page-item active"><a class="page-link gotopage" title="Goto page" href="javascript:void(0)">${config.page} / ${Math.floor((fdata.length+(config.size-1))/config.size)}</a></li>
          <li class="page-item"><a class="page-link nextpage" title="Next" href="#">&#x23f5;</a></li>
          <li class="page-item"><a class="page-link lastpage" title="Last" href="#">&#x23f5;&#x2503;</a></li>
        </ul><span class="page-info">${(config.page-1)*config.size}-${Math.min(fdata.length,config.page*config.size)} of ${data.length!=fdata.length?`${fdata.length}/ `:''} ${data.length}</span>
      `;
    }
    var nextPage=function(){config.page=Math.floor(Math.min(config.page+1,(fdata.length+config.size-1)/config.size));render();};
    var prevPage=function(){config.page=Math.max(1, config.page-1);render();};
    var lastPage=function(){config.page=Math.floor((fdata.length+config.size-1)/config.size);render();};
    var firstPage=function(){config.page=1;render();};
    
    var sort=function(i,desc){
      var isSorted=thead.querySelector("th:nth-child("+(i)+")").classList.contains("sorted");

      data.sort((a,b)=>{
        a=a[i-1].replace(/(<([^>]+)>)/gi,"");b=b[i-1].replace(/(<([^>]+)>)/gi,"");
        return ((isSorted || (desc===true))?-1:1)*(isNaN(parseFloat(a))? ( (a<b?-1:(a>b)?1:0) ) :(a-b));
      });

      if(thead.querySelector("th.sorted")!==null) thead.querySelector("th.sorted").classList.remove("sorted");
      if(thead.querySelector("th.sorted-desc")!==null) thead.querySelector("th.sorted-desc").classList.remove("sorted-desc");
      thead.querySelector(" th:nth-child("+(i)+")").classList.add((isSorted || desc===true)?"sorted-desc":"sorted");
      render();
    };

    var wrapper=this.document.createElement("DIV");wrapper.classList.add("fathgrid-wrapper");
    table.parentNode.insertBefore(wrapper,table);
    wrapper.appendChild(table);

    table.insertAdjacentHTML('afterend', `<nav id="paginator${id}">`+renderPaginator()+'</nav>');
    table.insertAdjacentHTML('beforeBegin', `<nav class="fathgrid-export-nav" id="exporter${id}"><a href="javascript:void(0)" title="Export" data-format="txt">TXT</a> <a href="javascript:void(0)" title="Export" data-format="csv">CSV</a> <a href="javascript:void(0)" title="Export" data-format="html">HTML</a></nav>`);
    var paginator=table.parentElement.querySelector(`#paginator${id}`);
    var exporter=table.parentElement.querySelector(`#exporter${id}`);
    exporter.querySelectorAll(":scope a").forEach(a=>{a.addEventListener("click",function(e){downloadFile(getExportData(e.srcElement.dataset.format),"export."+e.srcElement.dataset.format)})});
    ("fathgrid "+config.tableClasses).split(" ").forEach(x=>{if(x!=='')table.classList.add(x)});

    config.tableHeadClasses.split(" ").forEach(x=>{if(x!=='')thead.classList.add(x)});
    
    if(data===null || data.length===0) table.querySelectorAll(":scope tbody tr").forEach(tr => {
      var row=[];
      tr.querySelectorAll(":scope td").forEach(td => {
        row.push(td.innerHTML);
      });
      data.push(row);
    });

    data=data.map((x,idx)=>{x.id=idx+1;return x;});

    thead.querySelectorAll("tr th").forEach((th,i) => {th.style.cursor="pointer";th.addEventListener('click',function(e){sort(i+1);stop(e);});});

    if(config.filter){
        var r=document.createElement("TR");r.classList.add("filter");
        thead.querySelectorAll("tr th").forEach((th,idx) => {var f=document.createElement("TH");
        var i=undefined;
        if(config.columns[idx+1]!==undefined && config.columns[idx+1].filter!==this.undefined) {
            i=document.createElement("SELECT");i.add(document.createElement("OPTION"));
            //i.setAttribute("multiple","multiple");
            var ff=config.columns[idx+1].filter;
            if(null===ff) {ff=[];fdata.forEach(v=>{if(!ff.includes(v[idx]))ff.push(v[idx])});}
            ff.sort();
            ff.forEach(v=>{var o=document.createElement("OPTION");o.innerText=v;o.value=v;i.add(o);});
        } else i=document.createElement("INPUT");
        i.classList.add("form-control");
        i.dataset.i=idx;i.style.width="100%";
        f.append(i);r.append(f);});
        thead.append(r);
        r.querySelectorAll(":scope input, select").forEach(i=>{i.addEventListener("change",function(e){render();});});
    }

    var stop=function(e){e.preventDefault();e.stopPropagation();};
    var render=function(){
        table.querySelectorAll(":scope tbody tr").forEach(tr => {tr.parentNode.removeChild(tr);});

        fdata=data.filter(x=>{
            var ok=true;
            thead.querySelectorAll(":scope input, select").forEach(i=>{
              var opts=Array.from(i.querySelectorAll(":scope option:checked"),y=>y.value);
              if(opts.filter(a=>a!='').length>0){
                var ok2=false;
                opts.forEach(y=>{if(y!='' && x[i.dataset.i].includes(y)) ok2=true;});
                if(!ok2) ok=false;
              }
              else if(i.value!='' && !x[i.dataset.i].includes(i.value)) ok=false;
            });
            return ok;
        });
        fdata.slice((config.page-1)*config.size,config.page*config.size).forEach((dr,idx)=>{
            var r=document.createElement("tr");
            r.dataset.id=dr.id;
            dr.forEach(x=>{var c=document.createElement('td');c.innerHTML=x;r.appendChild(c);})
            table.querySelector("tbody").appendChild(r);
        });

        paginator.innerHTML=renderPaginator();
        paginator.querySelectorAll(".nextpage").forEach(x=>{x.addEventListener('click',function(e){nextPage();stop(e);})});
        paginator.querySelectorAll(".prevpage").forEach(x=>{x.addEventListener('click',function(e){prevPage();stop(e);})});
        paginator.querySelectorAll(".lastpage").forEach(x=>{x.addEventListener('click',function(e){lastPage();stop(e);})});
        paginator.querySelectorAll(".firstpage").forEach(x=>{x.addEventListener('click',function(e){firstPage();stop(e);})});
        paginator.querySelectorAll(".gotopage").forEach(x=>{x.addEventListener('click',function(e){config.page=Math.max(1,Math.min(fdata.length/config.page,parseInt(prompt("Go to page number",config.page)||0)));render();stop(e);})});

        tbody.querySelectorAll("td").forEach(x=>{x.addEventListener("click",function(e){config.onClick(e.srcElement.parentNode.dataset.id,[...e.srcElement.parentNode.children].indexOf(e.srcElement)+1,e.srcElement);})});
        config.onRender();            
    };
    var editCell=function(row,col,el){
      if(config.editinput!==undefined) {
        config.editinput.parentNode.innerText=config.editinput.value;
        config.editinput.remove();
        config.editinput=undefined;
      }
      
      if(undefined!==config.columns[col] && (config.columns[col].editable===false || ((typeof config.columns[col].editable ==="function") && config.columns[col].editable(row,col,el)===false))) return;
      var coltype=(undefined!==config.columns[col] && undefined!==config.columns[col].type)?(config.columns[col].type):'text';
      var t=el.innerText;
      el.innerHTML=`<input type="${coltype}" style="width:100%;" class="form-control" id="coledit" name="col" value=""/>`;
      var i=el.querySelector(":scope #coledit");
      i.value=t;
      i.focus();
      i.select();
      i.addEventListener("keydown",function(e){
        if(undefined===row) return;
        if(13==e.which) {
          var old=data[row-1][col-1];
          data[row-1][col-1]=e.srcElement.value;
          config.onEdit(row,col,old,e.srcElement.value);
          render();
        }
        
        switch(e.which){
          case 9://esc
          case 27://esc
            render();
            break;
          case 38://up
            break;
          case 40://down
            break;
          case 37://left
            break;
          case 39://right
            break;
        }
      });
      config.editinput=i;
    };
    var downloadFile=function(blob,filename,type="text/plain"){
        const url = win.URL.createObjectURL(new Blob([blob], { type }));
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = (undefined===filename)?'export.txt':filename;
        document.body.appendChild(a);
        a.click();
        win.URL.revokeObjectURL(url);
    }
    var getExportData=function(fmt){
      var ret="";
      if(fmt=="txt") data.forEach(r=>{ret+="\n";r.forEach(f=>{ret+=f+"\t"})});
      if(fmt=="csv") {ret+="sep=,\n";data.forEach(r=>{r.forEach(f=>{ret+="\""+f.replace("\"","\\\"")+"\","});ret+="\n";});}
      if(fmt=="html") {ret+="<table><tbody>";data.forEach(r=>{ret+="<tr>";r.forEach(f=>{ret+="<td>"+f+"</td>"});ret+="</tr>";});ret+="</tbody></table>";}
      return ret;
    }

    render();
    return {
      id:id,
      render:render,
      nextPage:nextPage,
      prevPage:prevPage,
      lastPage:lastPage,
      firstPage:firstPage,
      sort:sort,
      filter:function(idx,str){thead.querySelector(".filter th:nth-child("+idx+")").querySelector(":scope input, select").value=str;render();},
      editCell:editCell,
      getData:function(){return data;},
      getExportData:getExportData,
    }
  }
})(typeof window !== "undefined" ? window : this));
